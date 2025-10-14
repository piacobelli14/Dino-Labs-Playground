WITH combined_plans AS (
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
    SELECT yr, medical_plan, medical_plan_design, apcd_id
    FROM combined_plans
    WHERE medical_plan <> 'Com-ErsTrs'

    UNION ALL
    SELECT yr, 'Com-Ers' AS medical_plan, medical_plan_design, apcd_id
    FROM combined_plans
    WHERE medical_plan = 'Com-ErsTrs'

    UNION ALL
    SELECT yr, 'Com-Trs' AS medical_plan, medical_plan_design, apcd_id
    FROM combined_plans
    WHERE medical_plan = 'Com-ErsTrs'
),
normalized_plans AS (
    SELECT
        yr,
        apcd_id,
        medical_plan,
        CASE 
            WHEN medical_plan IN ('Com-Ers', 'Com-Trs') THEN NULL
            ELSE medical_plan_design
        END AS medical_plan_design
    FROM expanded_plans
),
months_by_member AS (
    SELECT
        yr,
        apcd_id,
        medical_plan,
        medical_plan_design,
        COUNT(*) AS months_enrolled
    FROM normalized_plans
    GROUP BY yr, apcd_id, medical_plan, medical_plan_design
)
SELECT
    yr,
    medical_plan,
    medical_plan_design,
    COUNT(DISTINCT apcd_id) AS count_per_plan_grouping,
    SUM(months_enrolled)::numeric / 12 AS member_year
FROM months_by_member
GROUP BY yr, medical_plan, medical_plan_design
ORDER BY
    yr ASC,
    CASE
        WHEN medical_plan_design = 'FFS' THEN 1
        WHEN medical_plan_design = 'STAR' THEN 2
        WHEN medical_plan_design = 'STAR Health' THEN 3
        WHEN medical_plan_design = 'STAR Kids' THEN 4
        WHEN medical_plan_design = 'STAR+PLUS' THEN 5
        WHEN medical_plan_design = 'CHIP' THEN 6
        WHEN medical_plan_design IS NULL THEN 8
        ELSE 7
    END,
    medical_plan ASC;
