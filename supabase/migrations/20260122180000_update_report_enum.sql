-- Add forum_thread to report_target_type enum
ALTER TYPE report_target_type ADD VALUE IF NOT EXISTS 'forum_thread';
