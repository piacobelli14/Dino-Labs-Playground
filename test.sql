----------------------------------------------------------------------------------------------------------------------
----- Revised Plan Table Generation Script with Conditional Duplicate Handling
----------------------------------------------------------------------------------------------------------------------

DROP TABLE IF EXISTS research_dev.pi_agg_yrmon;

CREATE TABLE research_dev.pi_agg_yrmon AS
WITH base AS (
  SELECT *
  FROM research_di.agg_enrl_yrmon
),
xwalk_one AS (
  SELECT apcd_id, payor_code, mem_id
  FROM (
    SELECT
      b.apcd_id,
      b.payor_code,
      b.mem_id,
      ROW_NUMBER() OVER (
        PARTITION BY b.apcd_id
        ORDER BY b.payor_code ASC NULLS LAST, b.mem_id ASC NULLS LAST
      ) AS rn
    FROM research_data.xz_mpi_crosswalk_functional b
  ) AS b_ranked
  WHERE rn = 1
),
elig_one AS (
  SELECT
    carrier_specific_unique_member_id,
    payor_code,
    data_submitter_code,
    metal_tier,
    high_deductible_plan_indicator,
    supplementary_medical_insurance_benefits,
    insured_group_or_policy_number,
    member_medicare_beneficiary_identifier
  FROM (
    SELECT
      y.*,
      ROW_NUMBER() OVER (
        PARTITION BY y.carrier_specific_unique_member_id, y.payor_code
        ORDER BY
          y.member_medicare_beneficiary_identifier ASC NULLS LAST,
          y.insured_group_or_policy_number ASC NULLS LAST,
          y.data_submitter_code ASC NULLS LAST
      ) AS rn
    FROM research_data.eligibility y
  ) AS e_ranked
  WHERE rn = 1
)
SELECT
  a.*,
  b.payor_code,
  e.data_submitter_code,
  e.metal_tier,
  e.high_deductible_plan_indicator,
  e.supplementary_medical_insurance_benefits,
  e.insured_group_or_policy_number,
  e.member_medicare_beneficiary_identifier
FROM base a
LEFT JOIN xwalk_one b
  ON a.apcd_id = b.apcd_id
LEFT JOIN elig_one e
  ON e.carrier_specific_unique_member_id = b.mem_id
 AND e.payor_code = b.payor_code
;

drop table if exists research_dev.pi_agg_yrmon_plan1;
create table research_dev.pi_agg_yrmon_plan1 as
select
    a.apcd_id,
b.data_submitter_code,
    b.insured_group_or_policy_number,
a.payor_code,
    b.data_period_start as yrmon,
    p.code as code,
    b.member_insurance_product_category_code as medical_code,
    case
        when
            b.medical_coverage_under_this_plan='Y'
            /*and p.code not in (
                'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU',
                'AM','CH','LB','LM','TV','ZZ'
            )*/
        then 'Y' else 'N' end as med_indicator,
    case
        when
            b.medical_coverage_under_this_plan='Y'
            and b.primary_insurance_indicator='N'
              /*and p.code not in (
                'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU','AM','CH','LB','LM','TV','ZZ'
            ) */
        then 'Y' else 'N' end as secondary_med_indicator,
    b.pharmacy_coverage_under_this_plan pharm_indicator,
    b.dental_coverage_under_this_plan dental_indicator,
    case
        when p.code in (
            'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU',
            'AM','CH','LB','LM','TV','ZZ'
        ) then 'Medical Other'
        else p.plan_type
    end as plan_type,
    case
        when p.code in (
            'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU',
            'AM','CH','LB','LM','TV','ZZ'
        ) then 'Medical Other'
        else p.plan_design
    end as plan_design,
    left(b.plan_effective_date::VARCHAR(8),6)::int4 as plan_effective_ym,
    left(b.plan_term_date::VARCHAR(8),6)::int4 as plan_term_ym,
    0 as plan_indicator
from
    research_data.xz_mpi_crosswalk_functional a
    inner join research_data.eligibility b
        on a.mem_id = b.carrier_specific_unique_member_id
        and a.payor_code = b.payor_code
    left join research_di.apcd_plan_list p
        on trim(upper(b.member_insurance_product_category_code)) = trim(upper(p.code))
;

/*
insert into research_dev.pi_agg_yrmon_plan1
select a.apcd_id,
b.data_submitter_code,
    b.data_submitter_code,
a.payor_code,
    b.data_period_start as yrmon,
    p.code as code,
    p.code as medical_code,
    'Y' as med_indicator,
    'N' as secondary_med_indicator,
    'N' as pharm_indicator,
    'N' as dental_indicator,
    case
        when p.code in (
            'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU',
            'AM','CH','LB','LM','TV','ZZ'
        ) then 'Medical Other'
        else p.plan_type
    end as plan_type,
    case
        when p.code in (
            'AP','D','DB','FF','LC','LD','LI','LT','PE','PL','PP','RP','TF','TR','U','VA','WC','WU',
            'AM','CH','LB','LM','TV','ZZ'
        ) then 'Medical Other'
        else p.plan_design
    end as plan_design,
    null as plan_effective_ym,
    null as plan_term_ym,
    0 as plan_indicator
from
    research_data.xz_mpi_crosswalk_functional a
    inner join research_data.medical b
        on a.mem_id = b.carrier_specific_unique_member_id
        and a.payor_code = b.payor_code
    left join research_di.apcd_plan_list p
        on trim(upper(b.member_insurance_product_category_code)) = trim(upper(p.code))
left join research_data.eligibility e
on e.carrier_specific_unique_member_id = b.carrier_specific_unique_member_id
and e.data_period_start = b.data_period_start
where (coalesce(e.medical_coverage_under_this_plan, 'N') <> 'Y')
;
*/


update research_dev.pi_agg_yrmon_plan1
set plan_type = 'Pharmacy', plan_design = 'Unknown'
where (
plan_type not like 'Dental%' and
plan_type not like 'Vision%' and
plan_type not like 'Pharmacy%' and
plan_type not like 'Other%' and
plan_type not like 'Unknown%' and
plan_type not like 'NA(BLANK)%'
) and med_indicator = 'N' and secondary_med_indicator = 'N' and pharm_indicator = 'Y' and dental_indicator = 'N'
;
update research_dev.pi_agg_yrmon_plan1
set plan_type = 'Dental', plan_design = 'Unknown'
where (
plan_type not like 'Dental%' and
plan_type not like 'Vision%' and
plan_type not like 'Pharmacy%' and
plan_type not like 'Other%' and
plan_type not like 'Unknown%' and
plan_type not like 'NA(BLANK)%'
) and med_indicator = 'N' and secondary_med_indicator = 'N' and pharm_indicator = 'N' and dental_indicator = 'Y'
;
update research_dev.pi_agg_yrmon_plan1 set plan_type = 'Other', plan_design = 'Unknown'
where med_indicator = 'N' and secondary_med_indicator = 'N' and pharm_indicator = 'Y' and dental_indicator = 'Y'
;
update research_dev.pi_agg_yrmon_plan1 set plan_type = 'Unknown', plan_design = 'Unknown'
where med_indicator = 'N' and secondary_med_indicator = 'N' and pharm_indicator = 'N' and dental_indicator = 'N'
;
update research_dev.pi_agg_yrmon_plan1 set plan_type = 'Pharmacy', plan_design = 'Unknown'
where plan_type = 'Medicare FFS' and plan_design = 'Part D'
;
/*** Deprecate
update research_dev.pi_agg_yrmon_plan1
set plan_indicator = 1
where
    (yrmon between plan_effective_ym and plan_term_ym)
    or (plan_term_ym is null and yrmon >= plan_effective_ym)
;
***/
/** Change To **/
update research_dev.pi_agg_yrmon_plan1
set plan_indicator = 1
where plan_type
is not null and plan_type not in ('Other', 'Unknown', 'NA(BLANK)')
;
update research_dev.pi_agg_yrmon_plan1
set plan_type = null, plan_design = null, med_indicator = 'N', secondary_med_indicator = 'N', pharm_indicator = 'N', dental_indicator = 'N'
where plan_indicator = 0
;
-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan1_bkup;
create table research_dev.pi_agg_yrmon_plan1_bkup as
select * from research_dev.pi_agg_yrmon_plan1
;
--- Handle Plan Types
drop table if exists research_dev.pi_agg_yrmon_plan2;
create table research_dev.pi_agg_yrmon_plan2 as
select distinct
    p.apcd_id,
    p.yrmon,
    p.data_submitter_code,
    p.payor_code,
    y.fl_5agency,
    case
        when not (
            p.plan_type like 'Dental%' or
            p.plan_type like 'Vision%' or
            p.plan_type like 'Pharmacy%' or
            p.plan_type like 'Other%' or
            p.plan_type like 'Unknown%' or
            p.plan_type like 'NA(BLANK)%'
        )
        then p.med_indicator
        else 'N'
    end as med_indicator,
    case
        when not (
            p.plan_type like 'Dental%' or
            p.plan_type like 'Vision%' or
            p.plan_type like 'Pharmacy%' or
            p.plan_type like 'Other%' or
            p.plan_type like 'Unknown%' or
            p.plan_type like 'NA(BLANK)%'
        )
        then p.secondary_med_indicator
        else 'N'
    end as secondary_med_indicator,
    case
        when p.plan_type like 'Pharmacy%' or p.pharm_indicator = 'Y'
        then 'Y'
        else 'N'
    end as pharm_indicator,
    case
        when p.plan_type like 'Dental%' or p.dental_indicator = 'Y'
        then 'Y' else 'N'
        end as dental_indicator,
    case when p.plan_type like 'Dental%' then 'Dental' end as dental_plan,
    case when p.plan_type like 'Vision%' then 'Vision' end as vision_plan,
    case
        when p.plan_type like 'Pharmacy%'
        then 'Pharmacy'
    end as pharmacy_plan,
    case
        when mcd_medical_program is not null then 'Medicaid'
        when not (
            p.plan_type like 'Dental%' or
            p.plan_type like 'Vision%' or
            p.plan_type like 'Pharmacy%' or
            p.plan_type like 'Other%' or
            p.plan_type like 'Unknown%' or
            p.plan_type like 'NA(BLANK)%'
        )
        then p.plan_type
    end as medical_plan,
    case
     when mcd_medical_program is not null then mcd_medical_program
        when not (
            p.plan_type like 'Dental%' or
            p.plan_type like 'Vision%' or
            p.plan_type like 'Pharmacy%' or
            p.plan_type like 'Other%' or
            p.plan_type like 'Unknown%' or
            p.plan_type like 'NA(BLANK)%'
        ) and mcd_medical_program is null
        then p.plan_design
    end as medical_plan_design,
    case
        when p.plan_type like 'Other%'
        then p.plan_type
    end as other_plan
from
    research_dev.pi_agg_yrmon_plan1 p
left join research_dev.pi_agg_yrmon y
    on p.apcd_id = y.apcd_id
    and p.yrmon = y.yrmon
    and p.data_submitter_code = y.data_submitter_code
    and p.payor_code = y.payor_code
;

-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan2_a_bkup;
create table research_dev.pi_agg_yrmon_plan2_a_bkup as
select * from research_dev.pi_agg_yrmon_plan2
;

-- Adjust medical_plan for Commercial based on fl_5agency

drop table if exists temp_fl_5agency_combined;
drop table if exists research_dev.temp_fl_5agency_combined;
create table research_dev.temp_fl_5agency_combined as
WITH commercial_fl AS (
    SELECT
        apcd_id,
        yrmon,
        array_agg(DISTINCT lower(fl_5agency)) AS agencies
    FROM
        research_dev.pi_agg_yrmon_plan2
    WHERE
        medical_plan = 'Commercial'
    GROUP BY
        apcd_id, yrmon
)
SELECT
    apcd_id,
    yrmon,
    CASE
        WHEN 'ers' = ANY(agencies) AND 'trs' = ANY(agencies) THEN 'Com-ErsTrs'
        WHEN 'ers' = ANY(agencies) THEN 'Com-Ers'
        WHEN 'trs' = ANY(agencies) THEN 'Com-Trs'
        ELSE 'Commercial'
    END AS adjusted_medical_plan
FROM commercial_fl;

UPDATE research_dev.pi_agg_yrmon_plan2 p
SET medical_plan = t.adjusted_medical_plan
FROM temp_fl_5agency_combined t
WHERE p.apcd_id = t.apcd_id
AND p.yrmon = t.yrmon
AND p.medical_plan = 'Commercial';

-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan2_g_bkup;
create table research_dev.pi_agg_yrmon_plan2_g_bkup as
select * from research_dev.pi_agg_yrmon_plan2
;

drop table if exists research_dev.pi_agg_yrmon_indicator_aggregates;
create table research_dev.pi_agg_yrmon_indicator_aggregates as
select
    apcd_id,
    yrmon,
    data_submitter_code,
    payor_code,
    max(pharmacy_plan) pharmacy_plan,
    max(dental_plan) dental_plan,
    max(other_plan) other_plan,
    max(med_indicator) med_indicator,
    max(secondary_med_indicator) as secondary_med_indicator,
    max(pharm_indicator) as pharm_indicator,
    max(dental_indicator) as dental_indicator
from research_dev.pi_agg_yrmon_plan2
group by apcd_id, yrmon, data_submitter_code, payor_code
;

-- Backup
drop table if exists research_dev.pi_agg_yrmon_indicator_aggregates_bkup;
create table research_dev.pi_agg_yrmon_indicator_aggregates_bkup as
select * from research_dev.pi_agg_yrmon_indicator_aggregates
;

drop table if exists research_dev.pi_agg_yrmon_plan3;
create table research_dev.pi_agg_yrmon_plan3 as
select
    apcd_id as id,
    yrmon as ym,
    data_submitter_code,
    payor_code,
    max(dental_plan) as dental_plan1,
    max(vision_plan) as vision_plan1,
    max(pharmacy_plan) as pharmacy_plan1,
    max(medical_plan) as medical_plan1,
    max(medical_plan_design) as medical_plan_design1,
    max(other_plan) as other_plan1,
    max(med_indicator) as med_indicator,
    max(secondary_med_indicator) as secondary_med_indicator,
    max(pharm_indicator) as pharm_indicator,
    max(dental_indicator) as dental_indicator
from
    research_dev.pi_agg_yrmon_plan2
group by
    apcd_id, yrmon, data_submitter_code, payor_code
;

-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan3_a_bkup;
create table research_dev.pi_agg_yrmon_plan3_a_bkup as
select * from research_dev.pi_agg_yrmon_plan3
;

update research_dev.pi_agg_yrmon_plan2
set
    dental_plan = p.dental_plan1,
    vision_plan = p.vision_plan1,
    pharmacy_plan = p.pharmacy_plan1,
    medical_plan = p.medical_plan1,
    medical_plan_design = p.medical_plan_design1,
    other_plan = p.other_plan1,
    med_indicator = p.med_indicator,
    secondary_med_indicator = p.secondary_med_indicator,
    pharm_indicator = p.pharm_indicator,
    dental_indicator = p.dental_indicator
from
    research_dev.pi_agg_yrmon_plan3 p
where
    research_dev.pi_agg_yrmon_plan2.apcd_id = p.id
    and research_dev.pi_agg_yrmon_plan2.yrmon = p.ym
    and research_dev.pi_agg_yrmon_plan2.data_submitter_code = p.data_submitter_code
    and research_dev.pi_agg_yrmon_plan2.payor_code = p.payor_code
    --and left(ym::text,4)='2019'
;

-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan2_b_bkup;
create table research_dev.pi_agg_yrmon_plan2_b_bkup as
select * from research_dev.pi_agg_yrmon_plan2
;

drop table if exists research_dev.pi_agg_yrmon_plan2_d_bkup;
create table research_dev.pi_agg_yrmon_plan2_d_bkup as
select * from research_dev.pi_agg_yrmon_plan2
;

drop table if exists research_dev.pi_agg_yrmon_temp;
create table research_dev.pi_agg_yrmon_temp as
select * from research_dev.pi_agg_yrmon;
alter table research_dev.pi_agg_yrmon_temp drop column med_indicator;
alter table research_dev.pi_agg_yrmon_temp drop column secondary_med_indicator;
alter table research_dev.pi_agg_yrmon_temp drop column dental_indicator;
alter table research_dev.pi_agg_yrmon_temp drop column pharm_indicator;


drop table if exists research_dev.pi_agg_yrmon_plan3_2019; -- Run for all years.
create table research_dev.pi_agg_yrmon_plan3_2019 as -- Run for all years.
select distinct
    y.*,
    a.usps_zip_pref_state as member_state,
    case
        when x.dental_indicator = 'Y' then 'Dental'
        else x.dental_plan
    end as dental_plan,
    p.vision_plan,
    case
        when x.pharm_indicator = 'Y' then 'Pharmacy'
        else x.pharmacy_plan
    end as pharmacy_plan,
    p.medical_plan,
    p.medical_plan_design,
    p.other_plan,
    x.med_indicator,
    x.secondary_med_indicator,
    x.pharm_indicator,
    x.dental_indicator
from
    research_dev.pi_agg_yrmon_temp y
    left join research_dev.pi_agg_yrmon_plan2 p
        on y.apcd_id = p.apcd_id
        and y.yrmon = p.yrmon
        and y.data_submitter_code = p.data_submitter_code
        and y.payor_code = p.payor_code
    join research_dev.pi_agg_yrmon_indicator_aggregates x
        on x.apcd_id = y.apcd_id
        and x.yrmon = y.yrmon
        and x.data_submitter_code = y.data_submitter_code
        and x.payor_code = y.payor_code
    left join research_dev.zip_fips_crosswalk_full a on y.zip5 = a.zip
where yr = 2019; -- Run for all years.

drop table if exists research_dev.pi_agg_yrmon_plan3_update;
create table research_dev.pi_agg_yrmon_plan3_update as (
    select * from research_dev.pi_agg_yrmon_plan3_2019
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2020
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2021
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2022
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2023
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2024
    union all
    select * from research_dev.pi_agg_yrmon_plan3_2025
);
drop table if exists research_dev.pi_agg_yrmon_plan3_2019;
drop table if exists research_dev.pi_agg_yrmon_plan3_2020;
drop table if exists research_dev.pi_agg_yrmon_plan3_2021;
drop table if exists research_dev.pi_agg_yrmon_plan3_2022;
drop table if exists research_dev.pi_agg_yrmon_plan3_2023;
drop table if exists research_dev.pi_agg_yrmon_plan3_2024;
drop table if exists research_dev.pi_agg_yrmon_plan3_2025;

-- Backup
drop table if exists research_dev.pi_agg_yrmon_plan3_update_bkup;
create table research_dev.pi_agg_yrmon_plan3_update_bkup as
select * from research_dev.pi_agg_yrmon_plan3_update
;

update research_dev.pi_agg_yrmon_plan3_update
set medical_plan = 'Medicare MA'
where medical_plan = 'Commercial' and data_submitter_code = 'HCSC' and member_medicare_beneficiary_identifier is not null
;
update research_dev.pi_agg_yrmon_plan3_update
set medical_plan = 'Medicare Secondary'
where medical_plan = 'Medicare'
;


drop table if exists research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
create table research_dev.pi_agg_yrmon_plan_update_temp_merged_1 as
with plan_groups as (
    select 
        *,
        -- Flag if Medicaid exists in this apcd_id/yrmon group
        max(case when data_submitter_code = 'HHSC' then 1 else 0 end) over (partition by apcd_id, yrmon) as has_medicaid,
        -- Count non-Medicaid plans in the group
        sum(case when data_submitter_code <> 'HHSC' then 1 else 0 end) over (partition by apcd_id, yrmon) as non_medicaid_count
    from research_dev.pi_agg_yrmon_plan3_update
),
ranked_plans as (
    select *,
    case
        when medical_plan like 'Com%' then 1
        when medical_plan = 'Medicare FFS' and data_submitter_code = 'CHCDMDCR' then 2
        when medical_plan = 'Medicare' and data_submitter_code = 'CHCDMDCR' then 3
        when medical_plan = 'Medicare MA' and data_submitter_code = 'CHCDMDCR' then 4
        when medical_plan = 'Medicare Secondary' then 5
        else 6
    end as plan_priority,
    case
        when medical_plan_design = 'Part AB' then 1
        when medical_plan_design = 'Part A' then 2
        when medical_plan_design = 'Part B' then 3
        when medical_plan_design = 'Primary' then 4
        when medical_plan_design = 'Secondary' then 5
        when medical_plan_design = 'PPO' then 6
        when medical_plan_design = 'HMO' then 7
        when medical_plan_design = 'Unknown' then 8
        when medical_plan_design is not null then 9
        else 10
    end as design_priority
    from plan_groups
),
prioritized as (
    select *,
    -- Only rank non-HHSC plans for primary selection
    case 
        when data_submitter_code <> 'HHSC' then 
            row_number() over (
                partition by apcd_id, yrmon 
                order by plan_priority, design_priority
            )
        else null
    end as rn
    from ranked_plans
)
select
    apcd_id,
    max(yr) as yr,
    yrmon,
    max(dob) as dob,
    max(age) as age,
    max(gender) as gender,
    max(race_1) as race_1, max(race_2) as race_2, max(race_3) as race_3,
    max(hispanic_indicator) as hispanic_indicator, max(ethnicity_1) as ethnicity_1, max(ethnicity_2) as ethnicity_2,
    max(zip5) as zip5, max(fips) as fips,
    max(member_state) as member_state,
    max(metal_tier) as metal_tier,
    max(member_medicare_beneficiary_identifier) as member_medicare_beneficiary_identifier,
    max(high_deductible_plan_indicator) as high_deductible_plan_indicator,
    max(med_indicator) as med_indicator,
    max(secondary_med_indicator) as secondary_med_indicator,
    max(pharm_indicator) as pharm_indicator,
    max(dental_indicator) as dental_indicator,
    max(dental_plan) as dental_plan,
    max(vision_plan) as vision_plan,
    max(pharmacy_plan) as pharmacy_plan,
    -- Primary: If has non-HHSC plans, pick top-ranked non-HHSC; otherwise pick HHSC
    coalesce(
        max(case when data_submitter_code <> 'HHSC' and rn = 1 then medical_plan else null end),
        max(case when data_submitter_code = 'HHSC' then medical_plan else null end)
    ) as medical_plan_primary,
    -- Secondary: Only populate if has_medicaid=1 AND has other plans (non_medicaid_count > 0)
    max(case 
        when has_medicaid = 1 and non_medicaid_count > 0 and data_submitter_code = 'HHSC' 
        then medical_plan 
        else null 
    end) as medical_plan_secondary,
    -- Primary design
    coalesce(
        max(case when data_submitter_code <> 'HHSC' and rn = 1 then medical_plan_design else null end),
        max(case when data_submitter_code = 'HHSC' then medical_plan_design else null end)
    ) as medical_plan_design_primary,
    -- Secondary design: Only populate if has_medicaid=1 AND has other plans
    max(case 
        when has_medicaid = 1 and non_medicaid_count > 0 and data_submitter_code = 'HHSC' 
        then medical_plan_design 
        else null 
    end) as medical_plan_design_secondary,
    max(other_plan) as other_plan,
    max(insured_group_or_policy_number) as insured_group_or_policy_number
from prioritized
group by apcd_id, yrmon
;

update research_dev.pi_agg_yrmon_plan_update_temp_merged_1 set other_plan = 'Unknown' where other_plan = 'NA(BLANK)'
;

-- Quick QA
select * from research_dev.pi_agg_yrmon_plan_update_temp_merged_1 ; 
select count(*) from research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
select count(distinct apcd_id) from research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
select count(distinct apcd_id) from research_di.agg_enrl_yrmon;


-- Final Table Creation
drop table if exists research_di.agg_yrmon_plan cascade;
create table research_di.agg_yrmon_plan as
select * from research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
drop table if exists research_di.agg_yrmon_plan_dp cascade;
create table research_di.agg_yrmon_plan_dp as
select * from research_dev.pi_agg_yrmon_plan3;
grant all on research_di.agg_yrmon_plan to apcd_research;
grant all on research_di.agg_yrmon_plan_dp to apcd_research;

-- Quick QA

select count(distinct apcd_id) from research_di.agg_enrl_yrmon;
select count(distinct apcd_id) from research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
select count(distinct apcd_id) from research_dev.pi_agg_yrmon_plan_update_temp_merged_1 where pharm_indicator = 'Y';
select count(distinct apcd_id) from research_dev.pi_agg_yrmon_plan_update_temp_merged_1 where pharmacy_plan = 'Pharmacy';
select count(distinct concat(apcd_id,yrmon)), count(distinct apcd_id) from (
select
a.apcd_id,
(extract(year from a.dos_from) * 100 + extract(month from a.dos_from))::int as yrmon,
b.med_indicator
from research_di.medical_adj a
inner join research_dev.pi_agg_yrmon_plan_update b on
a.apcd_id = b.apcd_id
and a.payor_code = b.payor_code
and (extract(year from a.dos_from) * 100 + extract(month from a.dos_from))::int = b.yrmon
where b.med_indicator != 'Y' and b.secondary_med_indicator != 'Y'
) x;
