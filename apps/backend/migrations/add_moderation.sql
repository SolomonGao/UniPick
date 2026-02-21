-- 内容审核表
CREATE TABLE IF NOT EXISTS moderation_logs (
    id SERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL, -- 'item', 'profile', 'message'
    content_id VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    content_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'flagged', 'rejected'
    
    -- OpenAI Moderation 结果
    flagged BOOLEAN DEFAULT FALSE,
    categories JSONB, -- {sexual: true, hate: false, ...}
    scores JSONB, -- {sexual: 0.95, hate: 0.1, ...}
    
    -- 人工审核
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    review_note TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_moderation_status ON moderation_logs(status);
CREATE INDEX idx_moderation_content ON moderation_logs(content_type, content_id);
CREATE INDEX idx_moderation_user ON moderation_logs(user_id);
CREATE INDEX idx_moderation_created ON moderation_logs(created_at DESC);

-- 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_moderation_logs_updated_at ON moderation_logs;
CREATE TRIGGER update_moderation_logs_updated_at
    BEFORE UPDATE ON moderation_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 扩展 items 表
ALTER TABLE items ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE items ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER REFERENCES moderation_logs(id);

-- 扩展 profiles 表
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS moderation_log_id INTEGER REFERENCES moderation_logs(id);
