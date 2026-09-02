import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../lib/db/schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5433/airbharath_lms';
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding Airbharath LMS production test courses...');

  // 1. Create Admin & Student Test Users
  const [adminUser] = await db.insert(schema.users).values({
    phone: '919876543210',
    email: 'admin@airbharath.in',
    fullName: 'Captain Vikram Singh (Admin)',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
    role: 'admin',
  }).onConflictDoNothing().returning();

  const [studentUser] = await db.insert(schema.users).values({
    phone: '911234567890',
    email: 'student@airbharath.in',
    fullName: 'Rahul Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    role: 'student',
  }).onConflictDoNothing().returning();

  const adminId = adminUser?.id;

  // 2. Course 1: Content Creation & Digital Marketing Masterclass
  const [course1] = await db.insert(schema.courses).values({
    title: 'Content Creation & Digital Marketing Masterclass',
    slug: 'content-creation-digital-marketing',
    description: 'Learn to craft compelling digital content, build an engaged online audience, and master organic social media growth strategies.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
    price: '1499.00',
    accessDays: 365,
    isPublished: true,
    instructorId: adminId,
  }).onConflictDoNothing().returning();

  if (course1) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 1: Storytelling & Content Strategy',
      orderIndex: 1,
    }).onConflictDoNothing().returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 2: Video Production & Editing Essentials',
      orderIndex: 2,
    }).onConflictDoNothing().returning();

    const [mod3] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 3: Distribution & Audience Growth',
      orderIndex: 3,
    }).onConflictDoNothing().returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Lesson 1.1: Foundations of High-Impact Storytelling',
          content: '<h3>Hooking Your Audience in 3 Seconds</h3><p>Learn how to craft powerful hooks, structure narratives, and hold viewer attention across video and text formats.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Lesson 1.2: Defining Your Niche & Audience Persona',
          content: '<p>Identify your ideal audience demographic, pinpoint content pillars, and position your personal or business brand effectively.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 2,
        },
      ]).onConflictDoNothing();
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Smartphone Video Shooting & Lighting Secrets',
          content: '<p>Master natural lighting, framing, audio capture, and smartphone camera settings for high quality video output.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod2.id,
          title: 'Lesson 2.2: Fast Editing with CapCut & Premiere',
          content: '<p>Step-by-step editing workflow: jump cuts, dynamic captions, background music, and B-roll layering.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 2,
        },
      ]).onConflictDoNothing();
    }

    if (mod3) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod3.id,
          title: 'Lesson 3.1: Algorithm Mechanics & Virality Hacks',
          content: '<p>Understand watch time metrics, click-through rates, and algorithmic amplification on YouTube Shorts and Instagram Reels.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]).onConflictDoNothing();
    }
  }

  // 3. Course 2: AI Tools & Productivity Masterclass
  const [course2] = await db.insert(schema.courses).values({
    title: 'AI Tools & Workflow Automation for Professionals',
    slug: 'ai-tools-productivity-masterclass',
    description: 'Boost your workplace productivity by 10x using ChatGPT, Claude, Midjourney, and automated AI workflows.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800',
    price: '2499.00',
    accessDays: 365,
    isPublished: true,
    instructorId: adminId,
  }).onConflictDoNothing().returning();

  if (course2) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'Module 1: Advanced Prompt Engineering & ChatGPT',
      orderIndex: 1,
    }).onConflictDoNothing().returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'Module 2: AI Image & Visual Asset Generation',
      orderIndex: 2,
    }).onConflictDoNothing().returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Lesson 1.1: Core Prompting Frameworks (ROLE, TASK, CONTEXT)',
          content: '<h3>Structuring Prompts for Zero-Shot & Few-Shot Output</h3><p>Master precise prompt design to extract professional reports, code, and copy from AI models.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Lesson 1.2: Automating Email & Document Drafting',
          content: '<p>Use custom GPTs and prompt templates to automate client emails, meeting minutes, and executive summaries.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 2,
        },
      ]).onConflictDoNothing();
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Generating Commercial Graphics with Midjourney & DALL-E',
          content: '<p>Learn camera angles, aspect ratios, style parameters, and prompt syntax for realistic AI imagery.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]).onConflictDoNothing();
    }
  }

  // 4. Course 3: MS Excel & Data Analysis Essentials
  const [course3] = await db.insert(schema.courses).values({
    title: 'MS Excel & Financial Data Analysis Essentials',
    slug: 'excel-data-analysis-essentials',
    description: 'Master lookup formulas, pivot tables, data visualization dashboards, and financial analysis techniques.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    price: '1299.00',
    accessDays: 365,
    isPublished: true,
    instructorId: adminId,
  }).onConflictDoNothing().returning();

  if (course3) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Module 1: High-Speed Excel Formulas & Shortcuts',
      orderIndex: 1,
    }).onConflictDoNothing().returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Module 2: Interactive Dashboards & Pivot Tables',
      orderIndex: 2,
    }).onConflictDoNothing().returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Lesson 1.1: XLOOKUP, VLOOKUP, and INDEX-MATCH Mastery',
          content: '<h3>Mastering Data Lookups</h3><p>Learn error handling with IFERROR and perform two-dimensional dynamic lookups seamlessly.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Lesson 1.2: Conditional Logic & Logical Statements (IF, AND, OR)',
          content: '<p>Combine nested IF conditions and logical flags for complex financial calculations.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 2,
        },
      ]).onConflictDoNothing();
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Building Executive Pivot Table Dashboards',
          content: '<p>Create dynamic slicers, calculated fields, and interactive chart views for management reporting.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]).onConflictDoNothing();
    }
  }

  // 5. Sample Coupon Code
  await db.insert(schema.coupons).values({
    code: 'AIRBHARATH20',
    discountType: 'percentage',
    discountValue: '20.00',
    usageLimit: 500,
  }).onConflictDoNothing();

  console.log('✅ Local database successfully seeded with test courses & modules!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
