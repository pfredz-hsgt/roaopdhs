-- Sample data for testing PIMS

-- Insert sample inventory items
INSERT INTO inventory_items (name, type, section, row, bin, min_qty, max_qty, indent_source, remarks) VALUES
('Paracetamol 500mg', 'Tablet', 'F', '1', '1', 100, 500, 'OPD', 'Common pain reliever'),
('Amlodipine 10mg', 'Tablet', 'F', '1', '2', 50, 200, 'IPD', 'For hypertension'),
('Insulin Glargine', 'Injection', 'F', '2', '1', 20, 100, 'IPD', 'Keep refrigerated'),
('Amoxicillin 250mg/5ml', 'Syrup', 'F', '2', '2', 30, 150, 'OPD', 'Antibiotic suspension'),
('Chloramphenicol 0.5%', 'Eye Drops', 'G', '1', '1', 25, 100, 'OPD', 'Antibiotic eye drops'),
('Ciprofloxacin 0.3%', 'Ear Drops', 'G', '1', '2', 20, 80, 'OPD', 'For ear infections'),
('Metformin 500mg', 'Tablet', 'F', '3', '1', 100, 400, 'IPD', 'For diabetes'),
('Omeprazole 20mg', 'Tablet', 'F', '3', '2', 80, 300, 'OPD', 'Proton pump inhibitor'),
('Normal Saline 0.9%', 'Injection', 'G', '2', '1', 200, 1000, 'MFG', 'IV fluid'),
('Dextrose 5%', 'Injection', 'G', '2', '2', 150, 800, 'MFG', 'IV fluid'),
('Ceftriaxone 1g', 'Injection', 'F', '4', '1', 50, 200, 'IPD', 'Broad spectrum antibiotic'),
('Salbutamol Inhaler', 'Others', 'G', '3', '1', 40, 150, 'OPD', 'For asthma'),
('Hydrocortisone Cream', 'Others', 'G', '3', '2', 30, 120, 'OPD', 'Topical steroid'),
('Diazepam 5mg', 'Tablet', 'F', '4', '2', 25, 100, 'IPD', 'Controlled drug - handle with care'),
('Morphine 10mg', 'Injection', 'F', '5', '1', 15, 50, 'IPD', 'Controlled drug - restricted access');

-- Note: Run this after schema.sql and rls_policies.sql
