-- CreateTable
CREATE TABLE `unit_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `symbol` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `unit_master_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `department_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `department_master_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indent_type_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `indent_type_master_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indent_status_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_editable` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `indent_status_master_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_code` VARCHAR(50) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `specification` TEXT NULL,
    `drawing_number` VARCHAR(100) NULL,
    `default_unit_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` VARCHAR(64) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `item_master_item_code_key`(`item_code`),
    INDEX `item_master_is_active_item_name_idx`(`is_active`, `item_name`),
    INDEX `item_master_default_unit_id_idx`(`default_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_balance` (
    `item_id` INTEGER NOT NULL,
    `current_quantity` DECIMAL(18, 4) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `number_sequence` (
    `scope` VARCHAR(64) NOT NULL,
    `last_value` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`scope`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indent_master` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indent_number` VARCHAR(30) NOT NULL,
    `indent_type_id` INTEGER NOT NULL,
    `status_id` INTEGER NOT NULL,
    `department_id` INTEGER NULL,
    `indent_date` DATE NOT NULL,
    `indent_time` TIME(0) NOT NULL,
    `remark` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` VARCHAR(64) NOT NULL,
    `created_by_name` VARCHAR(150) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by_user_id` VARCHAR(64) NULL,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by_user_id` VARCHAR(64) NULL,
    `deleted_at` DATETIME(3) NULL,
    `deleted_by_user_id` VARCHAR(64) NULL,

    UNIQUE INDEX `indent_master_indent_number_key`(`indent_number`),
    INDEX `indent_master_indent_date_id_idx`(`indent_date`, `id`),
    INDEX `indent_master_status_id_indent_date_idx`(`status_id`, `indent_date`),
    INDEX `indent_master_indent_type_id_indent_date_idx`(`indent_type_id`, `indent_date`),
    INDEX `indent_master_department_id_indent_date_idx`(`department_id`, `indent_date`),
    INDEX `indent_master_created_by_user_id_indent_date_idx`(`created_by_user_id`, `indent_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indent_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indent_id` INTEGER NOT NULL,
    `line_number` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `item_code_snapshot` VARCHAR(50) NOT NULL,
    `item_name_snapshot` VARCHAR(255) NOT NULL,
    `specification_snapshot` TEXT NULL,
    `drawing_number_snapshot` VARCHAR(100) NULL,
    `department_id` INTEGER NOT NULL,
    `purpose` TEXT NULL,
    `current_stock_snapshot` DECIMAL(18, 4) NULL,
    `stock_checked_at` DATETIME(3) NULL,
    `required_quantity` DECIMAL(18, 4) NOT NULL,
    `required_unit_id` INTEGER NOT NULL,
    `required_date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` VARCHAR(64) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `updated_by_user_id` VARCHAR(64) NULL,

    INDEX `indent_item_item_id_idx`(`item_id`),
    INDEX `indent_item_department_id_idx`(`department_id`),
    INDEX `indent_item_required_unit_id_idx`(`required_unit_id`),
    UNIQUE INDEX `indent_item_indent_id_line_number_key`(`indent_id`, `line_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `indent_status_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `indent_id` INTEGER NOT NULL,
    `from_status_id` INTEGER NULL,
    `to_status_id` INTEGER NOT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changed_by_user_id` VARCHAR(64) NULL,
    `source` VARCHAR(20) NOT NULL,
    `note` VARCHAR(500) NULL,

    INDEX `indent_status_history_indent_id_changed_at_idx`(`indent_id`, `changed_at`),
    INDEX `indent_status_history_from_status_id_idx`(`from_status_id`),
    INDEX `indent_status_history_to_status_id_idx`(`to_status_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `item_master` ADD CONSTRAINT `item_master_default_unit_id_fkey` FOREIGN KEY (`default_unit_id`) REFERENCES `unit_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_balance` ADD CONSTRAINT `stock_balance_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_master` ADD CONSTRAINT `indent_master_indent_type_id_fkey` FOREIGN KEY (`indent_type_id`) REFERENCES `indent_type_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_master` ADD CONSTRAINT `indent_master_status_id_fkey` FOREIGN KEY (`status_id`) REFERENCES `indent_status_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_master` ADD CONSTRAINT `indent_master_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_item` ADD CONSTRAINT `indent_item_indent_id_fkey` FOREIGN KEY (`indent_id`) REFERENCES `indent_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_item` ADD CONSTRAINT `indent_item_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_item` ADD CONSTRAINT `indent_item_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `department_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_item` ADD CONSTRAINT `indent_item_required_unit_id_fkey` FOREIGN KEY (`required_unit_id`) REFERENCES `unit_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_status_history` ADD CONSTRAINT `indent_status_history_indent_id_fkey` FOREIGN KEY (`indent_id`) REFERENCES `indent_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_status_history` ADD CONSTRAINT `indent_status_history_from_status_id_fkey` FOREIGN KEY (`from_status_id`) REFERENCES `indent_status_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indent_status_history` ADD CONSTRAINT `indent_status_history_to_status_id_fkey` FOREIGN KEY (`to_status_id`) REFERENCES `indent_status_master`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- ===================================================================
-- HAND-WRITTEN SECTION (Prisma cannot express these)
-- Requires MySQL >= 8.0.16 for CHECK constraints to be enforced.
-- ===================================================================

-- Integrity rules (duplicated in app validation for friendly errors)
ALTER TABLE `indent_item`
    ADD CONSTRAINT `ck_indent_item_line_number` CHECK (`line_number` > 0),
    ADD CONSTRAINT `ck_indent_item_required_qty` CHECK (`required_quantity` > 0);

ALTER TABLE `indent_master`
    ADD CONSTRAINT `ck_indent_master_version` CHECK (`version` >= 1);

ALTER TABLE `number_sequence`
    ADD CONSTRAINT `ck_number_sequence_last_value` CHECK (`last_value` >= 0);

ALTER TABLE `indent_status_history`
    ADD CONSTRAINT `ck_status_history_source` CHECK (`source` IN ('APP', 'APPROVAL', 'SYSTEM'));

-- Reference rows the application cannot run without.
-- Only the two statuses this module owns. Approval statuses are inserted
-- once the approval team's contract is agreed.
INSERT INTO `indent_status_master` (`code`, `name`, `sort_order`, `is_editable`, `is_active`)
VALUES ('DRAFT', 'Draft', 10, TRUE, TRUE),
       ('SUBMITTED', 'Submitted', 20, FALSE, TRUE);

INSERT INTO `number_sequence` (`scope`, `last_value`, `updated_at`)
VALUES ('INDENT', 0, CURRENT_TIMESTAMP(3)),
       ('ITEM', 0, CURRENT_TIMESTAMP(3));
