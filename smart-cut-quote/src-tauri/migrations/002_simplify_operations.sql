-- Simplify operations to only Bending
-- Version 1.0.1

-- Deactivate all operations except Bending
UPDATE operations SET is_active = 0 WHERE id != 'op_bending';
