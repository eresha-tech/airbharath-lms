-- ============================================================
-- Lesson Materials Table
-- Stores PDF / image reference files attached to a lesson
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_materials (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson_id   UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_type   TEXT NOT NULL,          -- 'pdf' | 'image' | 'other'
  file_size   BIGINT,                 -- bytes
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;

-- Enrolled students + admins can view materials
CREATE POLICY "Enrolled students can view lesson materials" ON lesson_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON l.module_id = m.id
      JOIN enrollments e ON e.course_id = m.course_id
      WHERE l.id = lesson_materials.lesson_id
        AND e.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can manage materials
CREATE POLICY "Admins can manage lesson materials" ON lesson_materials
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
