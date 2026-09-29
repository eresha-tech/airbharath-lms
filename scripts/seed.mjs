import { assertDestructiveDatabaseOperation } from './database-safety.mjs';

assertDestructiveDatabaseOperation({
  databaseEnv: process.env.DATABASE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  acknowledgement: process.env.ALLOW_DESTRUCTIVE_DB_OPERATION,
});

const [{ default: postgres }, { drizzle }, schema] = await Promise.all([
  import('postgres'),
  import('drizzle-orm/postgres-js'),
  import('../lib/db/schema.ts'),
]);

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding Airbharath LMS 4 production courses (₹825 each)...');

  // 1. Create non-privileged development fixture users
  const [contentAuthor] = await db.insert(schema.users).values({
    phone: '910000000001',
    email: 'admin@airbharath.in',
    fullName: 'Sample Content Author',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
    role: 'student',
  }).onConflictDoNothing().returning();

  const [studentUser] = await db.insert(schema.users).values({
    phone: '910000000002',
    email: 'student@airbharath.in',
    fullName: 'Rahul Sharma (Student)',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    role: 'student',
  }).onConflictDoNothing().returning();

  const contentAuthorId = contentAuthor?.id;
  const studentId = studentUser?.id;

  // Clear existing records to ensure fresh seed
  try {
    await client`TRUNCATE TABLE invoices, certificates, progress, orders, lessons, modules, course_sections, videos, courses CASCADE`;
  } catch (e) {
    // If some optional tables don't exist yet, clear main tables directly
    await client`DELETE FROM lessons`;
    await client`DELETE FROM modules`;
    await client`DELETE FROM course_sections`;
    await client`DELETE FROM videos`;
    await client`DELETE FROM courses`;
  }

  // ==========================================
  // Course 1: AI Skills Masterclass (₹825) - Standalone (No Sections)
  // ==========================================
  const [course1] = await db.insert(schema.courses).values({
    title: 'AI Tools & Practical AI Skills Masterclass',
    slug: 'ai-skills',
    description: 'Master ChatGPT, Claude, Prompt Engineering, Midjourney, and real-world AI automation workflows to 10x your productivity.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/ai-skills.webp',
    price: '825.00',
    isPublished: true,
    instructorId: contentAuthorId,
  }).returning();

  // ==========================================
  // Sample Physical Video Library Assets (AWS HLS Transcoded)
  // ==========================================
  const sampleVideos = await db.insert(schema.videos).values([
    {
      courseId: course1.id,
      title: 'ChatGPT Prompting Frameworks (ROLE, TASK, CONTEXT)',
      status: 'ready',
      durationSeconds: 745,
      rawS3Key: `raw-uploads/${course1.id}/vid-chatgpt.mp4`,
      processedS3Prefix: `processed-videos/${course1.id}/vid-chatgpt/`,
    },
    {
      courseId: course1.id,
      title: 'Commercial Graphics with Midjourney & DALL-E',
      status: 'ready',
      durationSeconds: 620,
      rawS3Key: `raw-uploads/${course1.id}/vid-midjourney.mp4`,
      processedS3Prefix: `processed-videos/${course1.id}/vid-midjourney/`,
    },
    {
      courseId: course1.id,
      title: 'High-Impact Digital Storytelling & Hook Design',
      status: 'ready',
      durationSeconds: 510,
      rawS3Key: `raw-uploads/${course1.id}/vid-storytelling.mp4`,
      processedS3Prefix: `processed-videos/${course1.id}/vid-storytelling/`,
    },
    {
      courseId: course1.id,
      title: 'Excel Advanced Formulas: XLOOKUP & Dynamic Arrays',
      status: 'ready',
      durationSeconds: 890,
      rawS3Key: `raw-uploads/${course1.id}/vid-excel.mp4`,
      processedS3Prefix: `processed-videos/${course1.id}/vid-excel/`,
    },
    {
      courseId: course1.id,
      title: 'Startup Unit Economics: CAC, LTV & Margins',
      status: 'ready',
      durationSeconds: 680,
      rawS3Key: `raw-uploads/${course1.id}/vid-startup.mp4`,
      processedS3Prefix: `processed-videos/${course1.id}/vid-startup/`,
    },
  ]).returning();

  const vidChatGPT = sampleVideos[0]?.id;
  const vidMidjourney = sampleVideos[1]?.id;
  const vidMarketing = sampleVideos[2]?.id;
  const vidExcel = sampleVideos[3]?.id;
  const vidStartup = sampleVideos[4]?.id;

  if (course1) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'Prompt Engineering & ChatGPT Mastery',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course1.id,
      title: 'AI Visuals & Media Generation',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Core Prompting Frameworks (ROLE, TASK, CONTEXT)',
          content: '<h3>Structuring Prompts for Zero-Shot & Few-Shot Output</h3><p>Master precise prompt design to extract professional reports, code, and copy from AI models.</p>',
          videoUrl: vidChatGPT || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Automating Email & Document Drafting',
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
          title: 'Commercial Graphics with Midjourney & DALL-E',
          content: '<p>Learn camera angles, aspect ratios, style parameters, and prompt syntax for realistic AI imagery.</p>',
          videoUrl: vidMidjourney || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
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
    instructorId: contentAuthorId,
  }).returning();

  if (course2) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'Digital Marketing Strategy & Brand Positioning',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course2.id,
      title: 'SEO, Social Media Ads & Content Creation',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Foundations of High-Impact Storytelling',
          content: '<h3>Hooking Your Audience in 3 Seconds</h3><p>Learn how to craft powerful hooks, structure narratives, and hold viewer attention across video and text formats.</p>',
          videoUrl: vidMarketing || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
        {
          moduleId: mod1.id,
          title: 'Defining Your Niche & Audience Persona',
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
          title: 'Smartphone Video Shooting & Lighting Secrets',
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
    instructorId: contentAuthorId,
  }).returning();

  if (course3) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Idea Validation & Market Research',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course3.id,
      title: 'Building MVP & Unit Economics',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'Validating Your Startup Idea Before Building',
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
          title: 'Calculating CAC, LTV, and Margins',
          content: '<p>Understand Customer Acquisition Cost, Lifetime Value, gross margins, and runway management for sustainable growth.</p>',
          videoUrl: vidStartup || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
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
    instructorId: contentAuthorId,
  }).returning();

  if (course4) {
    const [mod1] = await db.insert(schema.modules).values({
      courseId: course4.id,
      title: 'Advanced Excel Formulas & Lookup Tools',
      orderIndex: 1,
    }).returning();

    const [mod2] = await db.insert(schema.modules).values({
      courseId: course4.id,
      title: 'Executive PowerPoint Presentations',
      orderIndex: 2,
    }).returning();

    if (mod1) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod1.id,
          title: 'XLOOKUP, VLOOKUP, and INDEX-MATCH Mastery',
          content: '<h3>Mastering Data Lookups</h3><p>Learn error handling with IFERROR and perform two-dimensional dynamic lookups seamlessly.</p>',
          videoUrl: vidExcel || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: true,
          orderIndex: 1,
        },
      ]);
    }

    if (mod2) {
      await db.insert(schema.lessons).values([
        {
          moduleId: mod2.id,
          title: 'Crafting Pitch Decks & Executive Slide Layouts',
          content: '<p>Design high-converting presentation slides, data charts, and visual storytelling for boardroom meetings.</p>',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          isFreePreview: false,
          orderIndex: 1,
        },
      ]);
    }
  }

  // ==========================================
  // Course 5: All-in-One 4-Course Combo Pass (4 SECTIONS + REUSED VIDEOS)
  // ==========================================
  const [course5] = await db.insert(schema.courses).values({
    title: 'All-in-One Masterclass Combo Pass (All 4 Courses)',
    slug: 'combo-pack',
    description: 'Get complete access to all 4 Airbharath certificate courses: AI Skills Masterclass, Digital Marketing, Excel Suite, and Entrepreneurship.',
    thumbnailUrl: 'https://assets.airbharath.in/lms/combo.webp',
    price: '3300.00',
    isPublished: true,
    instructorId: contentAuthorId,
  }).returning();

  if (course5) {
    // Section 1: AI Skills
    const [secAI] = await db.insert(schema.courseSections).values({
      courseId: course5.id,
      title: 'AI Skills',
      description: 'Master prompt engineering, generative models, and AI workflows.',
      orderIndex: 1,
    }).returning();

    if (secAI) {
      const [m1] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secAI.id,
        title: 'Introduction to AI',
        orderIndex: 1,
      }).returning();

      const [m2] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secAI.id,
        title: 'Generative AI',
        orderIndex: 2,
      }).returning();

      if (m1) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m1.id,
            title: 'What is AI?',
            content: '<p>Fundamental concepts of artificial intelligence and machine learning.</p>',
            videoUrl: vidChatGPT || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: true,
            orderIndex: 1,
          },
          {
            moduleId: m1.id,
            title: 'AI in Everyday Life',
            content: '<p>How consumer and enterprise AI applications function today.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
          {
            moduleId: m1.id,
            title: 'AI Ethics & Future Trends',
            content: '<p>Safety, hallucination management, and upcoming frontier model advancements.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 3,
          },
        ]);
      }

      if (m2) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m2.id,
            title: 'What is Generative AI?',
            content: '<p>Large Language Models and diffusion networks explained.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: true,
            orderIndex: 1,
          },
          {
            moduleId: m2.id,
            title: 'ChatGPT & Prompt Engineering Masterclass',
            content: '<p>Deep dive into production prompting techniques.</p>',
            videoUrl: vidChatGPT || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }
    }

    // Section 2: Digital Marketing
    const [secMarketing] = await db.insert(schema.courseSections).values({
      courseId: course5.id,
      title: 'Digital Marketing',
      description: 'Foundations of audience research, funnel strategy, and social growth.',
      orderIndex: 2,
    }).returning();

    if (secMarketing) {
      const [m1] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secMarketing.id,
        title: 'Marketing Fundamentals',
        orderIndex: 1,
      }).returning();

      const [m2] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secMarketing.id,
        title: 'Social Media Marketing',
        orderIndex: 2,
      }).returning();

      if (m1) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m1.id,
            title: 'Introduction to Digital Strategy',
            content: '<p>Core elements of omni-channel digital marketing.</p>',
            videoUrl: vidMarketing || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: true,
            orderIndex: 1,
          },
          {
            moduleId: m1.id,
            title: 'Audience Research & Persona Development',
            content: '<p>Mapping customer journeys and building high-converting buyer personas.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }

      if (m2) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m2.id,
            title: 'Meta Ads & Campaign Setup',
            content: '<p>Configuring pixel, custom audiences, and campaign optimization.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 1,
          },
          {
            moduleId: m2.id,
            title: 'Content Strategy & Virality Loops',
            content: '<p>Designing short-form reels and organic growth funnels.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }
    }

    // Section 3: Excel
    const [secExcel] = await db.insert(schema.courseSections).values({
      courseId: course5.id,
      title: 'Excel',
      description: 'Master spreadsheets, data analysis, formulas, and dashboards.',
      orderIndex: 3,
    }).returning();

    if (secExcel) {
      const [m1] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secExcel.id,
        title: 'Excel Basics',
        orderIndex: 1,
      }).returning();

      const [m2] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secExcel.id,
        title: 'Advanced Excel',
        orderIndex: 2,
      }).returning();

      if (m1) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m1.id,
            title: 'Spreadsheet Foundations & Navigation',
            content: '<p>Essential UI navigation, shortcuts, and table structuring.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: true,
            orderIndex: 1,
          },
          {
            moduleId: m1.id,
            title: 'Essential Formulas (SUM, AVERAGE, IF)',
            content: '<p>Mastering core statistical and conditional formulas.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }

      if (m2) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m2.id,
            title: 'Pivot Tables & Dynamic Slicers',
            content: '<p>Creating interactive summary reports from large datasets.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 1,
          },
          {
            moduleId: m2.id,
            title: 'Advanced Lookup & Matrix Calculations',
            content: '<p>Nested XLOOKUP, INDEX-MATCH, and array arithmetic.</p>',
            videoUrl: vidExcel || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }
    }

    // Section 4: Entrepreneurship
    const [secEnt] = await db.insert(schema.courseSections).values({
      courseId: course5.id,
      title: 'Entrepreneurship',
      description: 'Idea validation, business models, unit economics, and execution.',
      orderIndex: 4,
    }).returning();

    if (secEnt) {
      const [m1] = await db.insert(schema.modules).values({
        courseId: course5.id,
        sectionId: secEnt.id,
        title: 'Entrepreneurship Fundamentals',
        orderIndex: 1,
      }).returning();

      if (m1) {
        await db.insert(schema.lessons).values([
          {
            moduleId: m1.id,
            title: 'Problem-Solution Fit & Market Validation',
            content: '<p>How to test customer willingness to pay and validate startup hypotheses.</p>',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: true,
            orderIndex: 1,
          },
          {
            moduleId: m1.id,
            title: 'Business Models & Unit Economics',
            content: '<p>Calculating contribution margin, payback periods, and financial health.</p>',
            videoUrl: vidStartup || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            isFreePreview: false,
            orderIndex: 2,
          },
        ]);
      }
    }
  }

  // Enroll student user in Combo Pass
  if (studentId && course5) {
    await db.insert(schema.enrollments).values({
      userId: studentId,
      courseId: course5.id,
      status: 'active',
    }).onConflictDoNothing();

    // Query some lessons from Section 1 to mark completed
    const comboLessons = await db.query.lessons.findMany({
      limit: 3,
    });

    for (const l of comboLessons) {
      await db.insert(schema.progress).values({
        userId: studentId,
        lessonId: l.id,
        isCompleted: true,
      }).onConflictDoNothing();
    }
  }

  console.log('✅ Successfully seeded 4 standalone courses + 1 4-section Combo Pass with student enrollment and reusable Video Library assets!');
  await client.end();
}

seed().catch(() => {
  console.error('❌ Seeding failed. Database error details are intentionally omitted.');
  process.exit(1);
});
