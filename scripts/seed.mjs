import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../lib/db/schema.ts';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres@localhost:5433/airbharath_lms';
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding Airbharath LMS 4 production courses (₹825 each)...');

  // 1. Create Admin & Student Test Users
  const [adminUser] = await db.insert(schema.users).values({
    phone: '919876543210',
    email: 'admin@airbharath.in',
    fullName: 'Captain Vikram Singh (Admin)',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
    role: 'admin',
  }).onConflictDoNothing().returning();

  const adminId = adminUser?.id;

  // Clear existing records to ensure fresh 4 courses seed
  try {
    await client`TRUNCATE TABLE invoices, certificates, progress, orders, lessons, modules, courses CASCADE`;
  } catch (e) {
    // If some optional tables don't exist yet, clear main tables directly
    await client`DELETE FROM lessons`;
    await client`DELETE FROM modules`;
    await client`DELETE FROM courses`;
  }

  // ==========================================
  // Course 1: AI Skills Masterclass (₹825)
  // ==========================================
  const [course1] = await db.insert(schema.courses).values({
    title: 'AI Tools & Practical AI Skills Masterclass',
    slug: 'ai-skills',
    description: 'Master ChatGPT, Claude, Prompt Engineering, Midjourney, and real-world AI automation workflows to 10x your productivity.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/ai-skills.webp',
    price: '825.00',
    isPublished: true,
    instructorId: adminId,
  }).returning();

  if (course1) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 1: Prompt Engineering & ChatGPT Mastery',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Module 2: AI Visuals & Media Generation',
      orderIndex: 2,
    }).returning();

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
      ]);
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Commercial Graphics with Midjourney & DALL-E',
          content: '<p>Learn camera angles, aspect ratios, style parameters, and prompt syntax for realistic AI imagery.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]);
    }
  }

  // ==========================================
  // Course 2: Digital Marketing & Content Creation Blueprint (₹825)
  // ==========================================
  const [course2] = await db.insert(schema.courses).values({
    title: 'Digital Marketing & Content Creation Blueprint',
    slug: 'content-creation',
    description: 'Master modern digital marketing, SEO, social media advertising, content strategy, video creation, and online brand growth.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/content-creation.webp',
    price: '825.00',
    isPublished: true,
    instructorId: adminId,
  }).returning();

  if (course2) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'Module 1: Digital Marketing Strategy & Brand Positioning',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'Module 2: SEO, Social Media Ads & Content Creation',
      orderIndex: 2,
    }).returning();

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
      ]);
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
      ]);
    }
  }

  // ==========================================
  // Course 3: Entrepreneurship & Startup Launch (₹825)
  // ==========================================
  const [course3] = await db.insert(schema.courses).values({
    title: 'Entrepreneurship & Startup Launch Masterclass',
    slug: 'entrepreneurship',
    description: 'From business idea validation to fundraising, unit economics, marketing, and scaling your high-growth startup.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/entrepreneurship.webp',
    price: '825.00',
    isPublished: true,
    instructorId: adminId,
  }).returning();

  if (course3) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Module 1: Idea Validation & Market Research',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Module 2: Building MVP & Unit Economics',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Lesson 1.1: Validating Your Startup Idea Before Building',
          content: '<h3>Customer Discovery & Problem Definition</h3><p>Learn how to interview potential customers, analyze market demand, and de-risk your business model.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
      ]);
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Calculating CAC, LTV, and Margins',
          content: '<p>Understand Customer Acquisition Cost, Lifetime Value, gross margins, and runway management for sustainable growth.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]);
    }
  }

  // ==========================================
  // Course 4: MS Office & Productivity Suite (₹825)
  // ==========================================
  const [course4] = await db.insert(schema.courses).values({
    title: 'MS Office, Excel & Business Productivity Suite',
    slug: 'ms-office',
    description: 'Master Advanced Excel, PowerPoint presentations, Word documentation, and corporate productivity tools.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/ms-office.webp',
    price: '825.00',
    isPublished: true,
    instructorId: adminId,
  }).returning();

  if (course4) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course4.id,
      title: 'Module 1: Advanced Excel Formulas & Lookup Tools',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course4.id,
      title: 'Module 2: Executive PowerPoint Presentations',
      orderIndex: 2,
    }).returning();

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
      ]);
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Lesson 2.1: Crafting Pitch Decks & Executive Slide Layouts',
          content: '<p>Design high-converting presentation slides, data charts, and visual storytelling for boardroom meetings.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]);
    }
  }

  // ==========================================
  // Course 5: All-in-One 4-Course Combo Pass (₹3300 list, ₹1900 with ABCOMBO coupon)
  // ==========================================
  const [course5] = await db.insert(schema.courses).values({
    title: 'All-in-One Masterclass Combo Pass (All 4 Courses)',
    slug: 'combo-pack',
    description: 'Get complete access to all 4 Airbharath certificate courses: AI Skills Masterclass, Content Creation Blueprint, Entrepreneurship Basics, and MS Office Productivity Suite.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/combo.webp',
    price: '3300.00',
    isPublished: true,
    instructorId: adminId,
  }).returning();

  if (course5) {
    const [modCombo] = await db.insert(schema.modules).values({
      courseId: course5.id,
      title: 'Module 1: All 4 Masterclass Tracks Combined Access',
      orderIndex: 1,
    }).returning();

    if (modCombo) {
      await db.insert(schema.lessons).values([
        {
          moduleId: modCombo.id,
          title: 'Lesson 1.1: Welcome to the All-in-One Airbharath Combo Pass',
          content: '<h3>Welcome to the Full Airbharath Certificate Bundle</h3><p>Enjoy access to all AI, Content Creation, Entrepreneurship, and MS Office modules and QR-verified PDF certificates.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
      ]);
    }
  }

  // ABCOMBO Auto-Applied Coupon Code (Flat ₹1400 discount -> ₹3300 - ₹1400 = ₹1900)
  await db.insert(schema.coupons).values({
    code: 'ABCOMBO',
    discountType: 'flat',
    discountValue: '1400.00',
    usageLimit: 10000,
  }).onConflictDoNothing();

  // Sample Coupon Code
  await db.insert(schema.coupons).values({
    code: 'AIRBHARATH20',
    discountType: 'percentage',
    discountValue: '20.00',
    usageLimit: 500,
  }).onConflictDoNothing();

  console.log('✅ Successfully seeded 4 courses (₹825) + 1 Combo Pass (₹3300 -> ₹1900 with ABCOMBO coupon)!');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ Seeding error:', err);
  process.exit(1);
});
