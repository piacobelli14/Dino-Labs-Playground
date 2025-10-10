WITH combined_plans AS (
    -- Primary plans
    SELECT 
        yr,
        medical_plan_primary AS medical_plan,
        medical_plan_design_primary AS medical_plan_design,
        apcd_id
    FROM research_dev.pi_agg_yrmon_plan_update_temp_merged_1
    WHERE medical_plan_primary IS NOT NULL 
        AND medical_plan_primary IN ('Medicaid', 'Com-Ers', 'Com-Trs', 'Com-ErsTrs')
        AND medical_plan_design_primary NOT IN ('CHIP PERI', 'HTW', 'NorthStar', 'MMP')
    
    UNION ALL
    
    -- Secondary plans
    SELECT 
        yr,
        medical_plan_secondary AS medical_plan,
        medical_plan_design_secondary AS medical_plan_design,
        apcd_id
    FROM research_dev.pi_agg_yrmon_plan_update_temp_merged_1
    WHERE medical_plan_secondary IS NOT NULL 
        AND medical_plan_secondary IN ('Medicaid', 'Com-Ers', 'Com-Trs', 'Com-ErsTrs')
        AND medical_plan_design_secondary NOT IN ('CHIP PERI', 'HTW', 'NorthStar', 'MMP')
),
expanded_plans AS (
    -- Keep all non-ErsTrs plans as is
    SELECT 
        yr,
        medical_plan,
        medical_plan_design,
        apcd_id
    FROM combined_plans
    WHERE medical_plan != 'Com-ErsTrs'
    
    UNION ALL
    
    -- Split Com-ErsTrs into Com-Ers
    SELECT 
        yr,
        'Com-Ers' AS medical_plan,
        medical_plan_design,
        apcd_id
    FROM combined_plans
    WHERE medical_plan = 'Com-ErsTrs'
    
    UNION ALL
    
    -- Split Com-ErsTrs into Com-Trs
    SELECT 
        yr,
        'Com-Trs' AS medical_plan,
        medical_plan_design,
        apcd_id
    FROM combined_plans
    WHERE medical_plan = 'Com-ErsTrs'
)
SELECT 
    yr,
    medical_plan,
    CASE 
        WHEN medical_plan IN ('Com-Ers', 'Com-Trs') THEN NULL 
        ELSE medical_plan_design 
    END AS medical_plan_design,
    COUNT(DISTINCT apcd_id) AS count_per_plan_grouping
FROM expanded_plans
GROUP BY 
    yr, 
    medical_plan,
    CASE 
        WHEN medical_plan IN ('Com-Ers', 'Com-Trs') THEN NULL 
        ELSE medical_plan_design 
    END
ORDER BY yr ASC, count_per_plan_grouping DESC;




drop table if exists research_dev.pi_agg_yrmon_plan_update_temp_merged_1;
create table research_dev.pi_agg_yrmon_plan_update_temp_merged_1 as
with ranked_plans as (
    select *,
    -- Recode Medicaid Unknown to STAR
    case 
        when medical_plan = 'Medicaid' and medical_plan_design = 'Unknown' then 'STAR'
        else medical_plan_design
    end as corrected_design,
    case
        when medical_plan like 'Com%' then 1
        when medical_plan = 'Medicare FFS' then 2
        when medical_plan = 'Medicare' then 3
        when medical_plan = 'Medicare MA' then 4
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
    from research_dev.pi_agg_yrmon_plan3_update
),
prioritized as (
    select *,
    -- Rank non-Medicaid plans only
    case 
        when medical_plan <> 'Medicaid' then 
            row_number() over (
                partition by apcd_id, yrmon 
                order by plan_priority, design_priority
            )
        else null
    end as rn
    from ranked_plans
),
aggregated as (
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
        max(supplementary_medical_insurance_benefits) as supplementary_medical_insurance_benefits,
        max(fl_5agency) as fl_5agency,
        max(med_indicator) as med_indicator,
        max(secondary_med_indicator) as secondary_med_indicator,
        max(pharm_indicator) as pharm_indicator,
        max(dental_indicator) as dental_indicator,
        max(dental_plan) as dental_plan,
        max(vision_plan) as vision_plan,
        max(pharmacy_plan) as pharmacy_plan,
        max(other_plan) as other_plan,
        max(insured_group_or_policy_number) as insured_group_or_policy_number,
        -- Get the top non-Medicaid plan (using corrected_design)
        max(case when medical_plan <> 'Medicaid' and rn = 1 then medical_plan else null end) as non_medicaid_plan,
        max(case when medical_plan <> 'Medicaid' and rn = 1 then corrected_design else null end) as non_medicaid_design,
        -- Get the Medicaid plan (using corrected_design)
        max(case when medical_plan = 'Medicaid' then medical_plan else null end) as medicaid_plan,
        max(case when medical_plan = 'Medicaid' then corrected_design else null end) as medicaid_design,
        -- Check if non-Medicaid plan is Medicare type
        max(case when medical_plan <> 'Medicaid' and rn = 1 and medical_plan in ('Medicare', 'Medicare FFS', 'Medicare MA', 'Medicare Secondary') then 1 else 0 end) as has_medicare
        
    from prioritized
    group by apcd_id, yrmon
)
select
    apcd_id,
    yr,
    yrmon,
    dob,
    age,
    gender,
    race_1, race_2, race_3,
    hispanic_indicator, ethnicity_1, ethnicity_2,
    zip5, fips,
    member_state,
    metal_tier,
    member_medicare_beneficiary_identifier,
    supplementary_medical_insurance_benefits,
    high_deductible_plan_indicator,
    med_indicator,
    secondary_med_indicator,
    pharm_indicator,
    dental_indicator,
    dental_plan,
    vision_plan,
    pharmacy_plan,
    -- Logic for primary plan:
    -- If dual enrolled (supplementary benefits) AND has both Medicaid and Medicare → Medicaid is primary
    -- Otherwise → Non-Medicaid is primary (or Medicaid if alone)
    case
        when supplementary_medical_insurance_benefits = 'Y' and medicaid_plan is not null and has_medicare = 1 
            then medicaid_plan
        else coalesce(non_medicaid_plan, medicaid_plan)
    end as medical_plan_primary,
    -- Logic for secondary plan:
    -- If dual enrolled AND has both Medicaid and Medicare → Medicare is secondary
    -- Otherwise if non-Medicaid and Medicaid both exist → Medicaid is secondary
    case
        when supplementary_medical_insurance_benefits = 'Y' and medicaid_plan is not null and has_medicare = 1 
            then non_medicaid_plan
        when non_medicaid_plan is not null and medicaid_plan is not null 
            then medicaid_plan
        else null
    end as medical_plan_secondary,
    -- Same logic for designs (now using corrected designs)
    case
        when supplementary_medical_insurance_benefits = 'Y' and medicaid_plan is not null and has_medicare = 1 
            then medicaid_design
        else coalesce(non_medicaid_design, medicaid_design)
    end as medical_plan_design_primary,
    case
        when supplementary_medical_insurance_benefits = 'Y' and medicaid_plan is not null and has_medicare = 1 
            then non_medicaid_design
        when non_medicaid_plan is not null and medicaid_plan is not null 
            then medicaid_design
        else null
    end as medical_plan_design_secondary,
    other_plan,
    insured_group_or_policy_number
from aggregated
;
