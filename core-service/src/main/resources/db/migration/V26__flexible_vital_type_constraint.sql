-- Migration V26: Allow standard vital types and abbreviated aliases in observations CHECK constraint
ALTER TABLE observations DROP CONSTRAINT IF EXISTS observations_vital_type_check;
ALTER TABLE observations ADD CONSTRAINT observations_vital_type_check CHECK (
    vital_type IN (
        'BLOOD_PRESSURE', 'HEART_RATE', 'RESPIRATORY_RATE', 'TEMPERATURE', 'O2_SATURATION', 'BLOOD_GLUCOSE', 'BMI', 'WEIGHT', 'HEIGHT',
        'BP', 'PULSE', 'TEMP', 'SPO2', 'GLUCOSE', 'HR', 'RR', 'WT', 'HT'
    )
);
