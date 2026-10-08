import { CATEGORIES } from '@/lib/workspace/eligibility/model';
import { pgTable, pgEnum, uuid, text, numeric, boolean, integer, timestamp, uniqueIndex, index, jsonb, check, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type { SetupState, FinancialState, ActivationState, ReservationState, PaymentState, EventState, WebhookEvidence } from '@/lib/workspace/payments/model';
import type { PlanCode, CouponStatus, CouponDefinition } from '@/lib/workspace/membership/model';
import type { SettingsConfig, Declarations, DecisionReason } from '@/lib/workspace/eligibility/model';
import { APPLICATION_STATUSES, APPROVAL_EMAIL_STATUSES, type ReviewAssessments } from '@/lib/workspace/options';

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: text('phone').unique(),
  email: text('email'),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('student').notNull(), // 'admin' | 'student'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Applications are separate from LMS accounts and course ownership.
export const workspaceApplicationStatus = pgEnum('workspace_application_status', APPLICATION_STATUSES);
export const workspaceApprovalEmailStatus = pgEnum('workspace_approval_email_status', APPROVAL_EMAIL_STATUSES);
export const workspaceApplications = pgTable('workspace_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationReference: text('application_reference').unique().notNull(),
  submissionKey: uuid('submission_key').unique().notNull(),
  payloadHash: text('payload_hash').notNull(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull(),
  mobile: text('mobile').notNull(),
  city: text('city').notNull(),
  country: text('country').notNull(),
  aviationBackground: text('aviation_background').notNull(),
  currentRole: text('current_role').notNull(),
  organisation: text('organisation'),
  yearsExperience: text('years_experience').notNull(),
  professionalProfileUrl: text('professional_profile_url'),
  proposedCourseTopic: text('proposed_course_topic').notNull(),
  courseDescription: text('course_description').notNull(),
  targetLearner: text('target_learner').notNull(),
  learnerOutcome: text('learner_outcome').notNull(),
  courseReadiness: text('course_readiness').notNull(),
  teachingExperienceType: text('teaching_experience_type').notNull(),
  teachingExperienceDescription: text('teaching_experience_description'),
  sampleContentUrl: text('sample_content_url'),
  audienceStatus: text('audience_status').notNull(),
  audienceChannels: text('audience_channels').array().notNull(),
  audienceSize: text('audience_size'),
  joiningReason: text('joining_reason').notNull(),
  additionalInformation: text('additional_information'),
  applicationStatus: workspaceApplicationStatus('application_status').default('submitted').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  consentAccuracy: boolean('consent_accuracy').notNull(),
  consentContact: boolean('consent_contact').notNull(),
  consentAccuracyAt: timestamp('consent_accuracy_at', { withTimezone: true }).notNull(),
  consentContactAt: timestamp('consent_contact_at', { withTimezone: true }).notNull(),
  consentVersion: text('consent_version').notNull(),
  reviewAssessments: jsonb('review_assessments').$type<ReviewAssessments>().default({}).notNull(),
  internalNotes: text('internal_notes').default('').notNull(),
  decisionReason: text('decision_reason').default('').notNull(),
  potentialDuplicate: boolean('potential_duplicate').default(false).notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
  receiptSentAt: timestamp('receipt_sent_at', { withTimezone: true }),
  approvalEmailStatus: workspaceApprovalEmailStatus('approval_email_status').default('not_sent').notNull(),
  approvalEmailSentAt: timestamp('approval_email_sent_at', { withTimezone: true }),
  approvalEmailSentBy: uuid('approval_email_sent_by').references(() => users.id, { onDelete: 'set null' }),
  approvalEmailAttemptedAt: timestamp('approval_email_attempted_at', { withTimezone: true }),
  approvalEmailAttemptedBy: uuid('approval_email_attempted_by').references(() => users.id, { onDelete: 'set null' }),
  approvalEmailAttemptId: uuid('approval_email_attempt_id'),
  approvalEmailErrorCategory: text('approval_email_error_category'),
  approvalEmailPersonalNote: text('approval_email_personal_note').default('').notNull(),
}, (t) => [
  index('workspace_applications_status_submitted_idx').on(t.applicationStatus, t.submittedAt),
  index('workspace_applications_email_idx').on(t.email),
]);

// Courses Table
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  slug: text('slug'),
  description: text('description'),
  shortDescription: text('short_description'),
  aboutCourse: text('about_course'),
  whatYouWillLearn: text('what_you_will_learn'),
  whoIsThisFor: text('who_is_this_for'),
  prerequisites: text('prerequisites'),
  contentOverview: text('content_overview'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  thumbnailUrl: text('thumbnail_url'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  accessDays: integer('access_days'), // null means lifetime access
  isPublished: boolean('is_published').default(false).notNull(),
  isBundle: boolean('is_bundle').default(false).notNull(),
  instructorId: uuid('instructor_id').references(() => users.id),
  certificateStatus: text('certificate_status').default('disabled').notNull(), // 'disabled' | 'active' | 'paused'
  certificateActivatedAt: timestamp('certificate_activated_at', { withTimezone: true }),
  certificateActivatedBy: uuid('certificate_activated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Course Bundle Items Table
export const courseBundleItems = pgTable('course_bundle_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleCourseId: uuid('bundle_course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t: any) => [
  uniqueIndex('bundle_course_item_unique_idx').on(t.bundleCourseId, t.courseId)
]);

// Course Sections Table
export const courseSections = pgTable('course_sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Modules Table
export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  sectionId: uuid('section_id').references(() => courseSections.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  practicalTask: text('practical_task'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Course Authors Table
export const courseAuthors = pgTable('course_authors', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  designation: text('designation'),
  bio: text('bio'),
  profileUrl: text('profile_url'),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Lessons Table
export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  content: text('content'),
  formulas: text('formulas'),
  videoUrl: text('video_url'),
  isFreePreview: boolean('is_free_preview').default(false).notNull(),
  orderIndex: integer('order_index').notNull(),
  deliveryType: text('delivery_type').default('recorded').notNull(), // 'recorded' | 'live'
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  releaseAt: timestamp('release_at', { withTimezone: true }),
  durationMinutes: integer('duration_minutes'),
  meetingUrl: text('meeting_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Lesson Materials Table
export const lessonMaterials = pgTable('lesson_materials', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Enrollments Table
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  status: text('status').default('active').notNull(), // 'active' | 'expired'
}, (t: any) => [
  uniqueIndex('user_course_unique_idx').on(t.userId, t.courseId)
]);

// Progress Table
export const progress = pgTable('progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t: any) => [
  uniqueIndex('user_lesson_unique_idx').on(t.userId, t.lessonId)
]);

// Orders Table
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  courseId: uuid('course_id').references(() => courses.id),
  razorpayOrderId: text('razorpay_order_id').unique().notNull(),
  razorpayPaymentId: text('razorpay_payment_id'),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'paid' | 'failed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Invoices Table
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  invoiceNumber: text('invoice_number').unique().notNull(),
  taxableAmount: numeric('taxable_amount', { precision: 10, scale: 2 }).notNull(),
  gstAmount: numeric('gst_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Certificates Table
export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  courseId: uuid('course_id').references(() => courses.id).notNull(),
  certificateCode: text('certificate_code').unique().notNull(),
  pdfUrl: text('pdf_url').notNull(),
  status: text('status').default('issued').notNull(), // 'issued' | 'revoked'
  issuedBy: uuid('issued_by').references(() => users.id), // null = student claim, uuid = admin
  issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
}, (t: any) => [
  uniqueIndex('user_course_cert_unique_idx').on(t.userId, t.courseId)
]);

// Feed Posts Table
export const feedPosts = pgTable('feed_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => users.id),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Jobs Table
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  company: text('company').notNull(),
  location: text('location'),
  description: text('description'),
  link: text('link'),
  postedBy: uuid('posted_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Coupons Table
export const coupons = pgTable('coupons', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').unique().notNull(),
  discountType: text('discount_type'), // 'percentage' | 'flat'
  discountValue: numeric('discount_value', { precision: 10, scale: 2 }).notNull(),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0).notNull(),
});

// Lesson Comments Table
export const lessonComments = pgTable('lesson_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Videos Table (AWS S3 + MediaConvert Pipeline)
export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  status: text('status').default('uploaded').notNull(), // 'uploaded' | 'processing' | 'ready' | 'failed'
  rawS3Key: text('raw_s3_key').notNull(),
  processedS3Prefix: text('processed_s3_prefix'),
  durationSeconds: integer('duration_seconds'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// PlaybackSessions Table (Concurrent Session Tracking Audit Log)
export const playbackSessions = pgTable('playback_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  active: boolean('active').default(true).notNull(),
});

// Video Captions Table (WebVTT Tracks per Reusable Video Asset)
export const videoCaptions = pgTable('video_captions', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }).notNull(),
  languageCode: text('language_code').default('en').notNull(),
  label: text('label').default('English').notNull(),
  s3Key: text('s3_key').notNull(),
  status: text('status').default('ready').notNull(), // 'ready' | 'processing' | 'failed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t: any) => [
  uniqueIndex('video_caption_lang_unique_idx').on(t.videoId, t.languageCode)
]);


// Relations
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  orders: many(orders),
  certificates: many(certificates),
  playbackSessions: many(playbackSessions),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, {
    fields: [courses.instructorId],
    references: [users.id],
  }),
  authors: many(courseAuthors),
  sections: many(courseSections),
  modules: many(modules),
  enrollments: many(enrollments),
  videos: many(videos),
  bundleItems: many(courseBundleItems, { relationName: 'bundleItems' }),
  bundledIn: many(courseBundleItems, { relationName: 'bundledIn' }),
}));

export const courseAuthorsRelations = relations(courseAuthors, ({ one }) => ({
  course: one(courses, {
    fields: [courseAuthors.courseId],
    references: [courses.id],
  }),
}));

export const courseBundleItemsRelations = relations(courseBundleItems, ({ one }) => ({
  bundle: one(courses, {
    fields: [courseBundleItems.bundleCourseId],
    references: [courses.id],
    relationName: 'bundleItems',
  }),
  course: one(courses, {
    fields: [courseBundleItems.courseId],
    references: [courses.id],
    relationName: 'bundledIn',
  }),
}));

export const courseSectionsRelations = relations(courseSections, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseSections.courseId],
    references: [courses.id],
  }),
  modules: many(modules),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  section: one(courseSections, {
    fields: [modules.sectionId],
    references: [courseSections.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
  materials: many(lessonMaterials),
  comments: many(lessonComments),
  videos: many(videos),
}));

export const lessonMaterialsRelations = relations(lessonMaterials, ({ one }) => ({
  lesson: one(lessons, {
    fields: [lessonMaterials.lessonId],
    references: [lessons.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [orders.courseId],
    references: [courses.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  user: one(users, {
    fields: [certificates.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [certificates.courseId],
    references: [courses.id],
  }),
}));

export const feedPostsRelations = relations(feedPosts, ({ one }) => ({
  author: one(users, {
    fields: [feedPosts.authorId],
    references: [users.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  course: one(courses, {
    fields: [videos.courseId],
    references: [courses.id],
  }),
  lesson: one(lessons, {
    fields: [videos.lessonId],
    references: [lessons.id],
  }),
  playbackSessions: many(playbackSessions),
  captions: many(videoCaptions),
}));

export const videoCaptionsRelations = relations(videoCaptions, ({ one }) => ({
  video: one(videos, {
    fields: [videoCaptions.videoId],
    references: [videos.id],
  }),
}));

export const playbackSessionsRelations = relations(playbackSessions, ({ one }) => ({
  user: one(users, {
    fields: [playbackSessions.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [playbackSessions.videoId],
    references: [videos.id],
  }),
}));


// Phase 1.3: eligibility is independent of learner roles and paid creator capability.
export const workspaceEligibilitySettings = pgTable('workspace_eligibility_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull().unique(),
  config: jsonb('config').$type<SettingsConfig>().notNull(),
  configurationHash: text('configuration_hash').notNull(),
  evaluatorVersion: text('evaluator_version').notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'restrict' }),
}, (t) => [
  uniqueIndex('workspace_eligibility_settings_current_idx').on(t.isCurrent).where(sql`${t.isCurrent} = true`),
  check('workspace_eligibility_settings_version_check', sql`${t.version} > 0`),
  check('workspace_eligibility_settings_bounds_check', sql`(${t.config}->>'minimumExperienceMonths')::integer BETWEEN 1 AND 600 AND (${t.config}->>'eligibilityValidityDays')::integer BETWEEN 1 AND 90 AND (${t.config}->>'cooldownDays')::integer BETWEEN 1 AND 90 AND ${t.config}->>'timezone' = 'Asia/Kolkata' AND jsonb_typeof(${t.config}->'profileRequired') = 'boolean' AND jsonb_array_length(${t.config}->'allowedCategories') BETWEEN 1 AND 15`),
]);
export const workspacePolicyVersions = pgTable('workspace_policy_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: text('version').notNull().unique(),
  kind: text('kind').default('eligibility').notNull(),
  declarations: jsonb('declarations').$type<Record<keyof Declarations, string>>().notNull(),
  contentHash: text('content_hash').notNull(),
  isCurrent: boolean('is_current').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('workspace_policy_versions_current_idx').on(t.kind).where(sql`${t.isCurrent} = true`),
  check('workspace_policy_versions_kind_check', sql`${t.kind} = 'eligibility'`),
]);
export const workspaceEligibilityResult = pgEnum('workspace_eligibility_result', ['eligible', 'ineligible']);
export const workspaceEligibilityAttempts = pgTable('workspace_eligibility_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  settingsId: uuid('settings_id').notNull().references(() => workspaceEligibilitySettings.id, { onDelete: 'restrict' }),
  policyId: uuid('policy_id').notNull().references(() => workspacePolicyVersions.id, { onDelete: 'restrict' }),
  submissionKey: uuid('submission_key').notNull(), payloadHash: text('payload_hash').notNull(),
  category: text('category').notNull(), aviationProfession: text('aviation_profession').default('').notNull(),
  experienceOption: text('experience_option').notNull(), experienceMonths: integer('experience_months').notNull(),
  professionalStatus: text('professional_status').notNull(), professionalStatusDetail: text('professional_status_detail').default('').notNull(),
  professionalProfileUrl: text('professional_profile_url').notNull(), teachingCategory: text('teaching_category').notNull(),
  courseIdea: text('course_idea').notNull(), declarations: jsonb('declarations').$type<Declarations>().notNull(),
  source: text('source').default('automatic').notNull(), evaluatorVersion: text('evaluator_version').notNull(),
  result: workspaceEligibilityResult('result').notNull(), reasons: jsonb('reasons').$type<DecisionReason[]>().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull(),
  decidedAt: timestamp('decided_at', { withTimezone: true }).notNull(),
  eligibleUntil: timestamp('eligible_until', { withTimezone: true }), reapplyAt: timestamp('reapply_at', { withTimezone: true }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
}, (t) => [
  uniqueIndex('workspace_eligibility_attempts_user_key_idx').on(t.userId, t.submissionKey),
  index('workspace_eligibility_attempts_user_decided_idx').on(t.userId, t.decidedAt),
  index('workspace_eligibility_attempts_result_decided_idx').on(t.result, t.decidedAt),
  check('workspace_eligibility_attempts_dates_check', sql`(${t.result} = 'eligible' AND ${t.eligibleUntil} IS NOT NULL AND ${t.eligibleUntil} > ${t.decidedAt} AND ${t.reapplyAt} IS NULL) OR (${t.result} = 'ineligible' AND ${t.reapplyAt} IS NOT NULL AND ${t.reapplyAt} > ${t.decidedAt} AND ${t.eligibleUntil} IS NULL)`),
  check('workspace_eligibility_attempts_source_check', sql`${t.source} = 'automatic'`),
  check('workspace_eligibility_attempts_text_check', sql`length(${t.courseIdea}) BETWEEN 1 AND 200 AND length(${t.professionalProfileUrl}) <= 2048 AND length(${t.aviationProfession}) <= 120 AND length(${t.professionalStatusDetail}) <= 120`),
  check('workspace_eligibility_attempts_experience_check', sql`${t.experienceMonths} = CASE ${t.experienceOption} WHEN 'under_one' THEN 0 WHEN 'one_year' THEN 12 WHEN 'two_years' THEN 24 WHEN 'three_to_five' THEN 36 WHEN 'six_to_ten' THEN 72 WHEN 'eleven_to_fifteen' THEN 132 WHEN 'sixteen_to_twenty' THEN 192 WHEN 'twenty_plus' THEN 240 ELSE -1 END AND ${t.experienceMonths} >= 0`),
  check('workspace_eligibility_attempts_declarations_check', sql`${t.declarations} @> '{"adult":true,"expertise":true,"accuracy":true,"eligibilityOnly":true,"courseReview":true,"audience":true,"authorizedClaims":true}'::jsonb`),
]);
export const workspaceAuditEvents = pgTable('workspace_audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  settingsId: uuid('settings_id').references(() => workspaceEligibilitySettings.id, { onDelete: 'restrict' }),
  couponId: uuid('coupon_id').references(() => workspaceCoupons.id, { onDelete: 'restrict' }),
  beforeStatus: text('before_status').$type<CouponStatus>(), afterStatus: text('after_status').$type<CouponStatus>(),
  action: text('action').default('eligibility_settings_published').notNull(),
  previousSettingsId: uuid('previous_settings_id').references(() => workspaceEligibilitySettings.id, { onDelete: 'restrict' }),
  requestKey: uuid('request_key').notNull(), payloadHash: text('payload_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('workspace_audit_events_actor_key_idx').on(t.actorId, t.requestKey),
  index('workspace_audit_events_settings_created_idx').on(t.settingsId, t.createdAt),
  index('workspace_audit_events_coupon_created_idx').on(t.couponId, t.createdAt),
  check('workspace_audit_events_action_check', sql`(${t.action} = 'eligibility_settings_published' AND ${t.settingsId} IS NOT NULL AND ${t.previousSettingsId} IS NOT NULL AND ${t.couponId} IS NULL AND ${t.beforeStatus} IS NULL AND ${t.afterStatus} IS NULL) OR (${t.action} IN ('coupon_created', 'coupon_status_changed') AND ${t.settingsId} IS NULL AND ${t.previousSettingsId} IS NULL AND ${t.couponId} IS NOT NULL AND ${t.afterStatus} IS NOT NULL AND ${t.afterStatus} IN ('active','paused','archived') AND ((${t.action} = 'coupon_created' AND ${t.beforeStatus} IS NULL AND ${t.afterStatus} = 'active') OR (${t.action} = 'coupon_status_changed' AND ${t.beforeStatus} IS NOT NULL AND ${t.beforeStatus} IN ('active','paused') AND ${t.beforeStatus} <> ${t.afterStatus})))`),
]);

// Phase 1.4: definitions and advisory economics only; no financial/redemption records.
export const workspaceMembershipPlans = pgTable('workspace_membership_plans', {
  id: uuid('id').defaultRandom().primaryKey(), code: text('code').$type<PlanCode>().notNull(), version: integer('version').notNull(),
  displayName: text('display_name').notNull(), durationMonths: integer('duration_months').notNull(),
  basePricePaise: integer('base_price_paise').notNull(), taxRateBps: integer('tax_rate_bps').default(1800).notNull(), currency: text('currency').$type<'INR'>().default('INR').notNull(),
  isCurrent: boolean('is_current').default(false).notNull(), available: boolean('available').default(true).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(), publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'restrict' }),
}, t => [
  uniqueIndex('workspace_plans_code_version_idx').on(t.code, t.version), uniqueIndex('workspace_plans_current_idx').on(t.code).where(sql`${t.isCurrent} = true`),
  check('workspace_plans_definition_check', sql`${t.version} > 0 AND length(${t.displayName}) BETWEEN 1 AND 80 AND ${t.basePricePaise} BETWEEN 1 AND 100000000 AND ${t.taxRateBps} = 1800 AND ${t.currency} = 'INR' AND ((${t.code} = 'quarterly' AND ${t.durationMonths} = 3) OR (${t.code} = 'half_yearly' AND ${t.durationMonths} = 6) OR (${t.code} = 'yearly' AND ${t.durationMonths} = 12))`),
]);
export const workspaceCoupons = pgTable('workspace_coupons', {
  id: uuid('id').defaultRandom().primaryKey(), scope: text('scope').default('workspace_membership').notNull(), code: text('code').notNull(),
  status: text('status').$type<CouponStatus>().default('active').notNull(), discountType: text('discount_type').$type<CouponDefinition['discountType']>().notNull(), discountValue: integer('discount_value').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }), expiresAt: timestamp('expires_at', { withTimezone: true }), usageLimit: integer('usage_limit'),
  campaignName: text('campaign_name').notNull(), sourceType: text('source_type').$type<CouponDefinition['sourceType']>().notNull(), sourceName: text('source_name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), version: integer('version').default(1).notNull(),
}, t => [
  uniqueIndex('workspace_coupons_scope_code_idx').on(t.scope, t.code), index('workspace_coupons_status_created_idx').on(t.status, t.createdAt),
  check('workspace_coupons_definition_check', sql`${t.scope} = 'workspace_membership' AND ${t.code} ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' AND ${t.status} IN ('active','paused','archived') AND ((${t.discountType} = 'fixed' AND ${t.discountValue} BETWEEN 1 AND 100000000) OR (${t.discountType} = 'percentage' AND ${t.discountValue} BETWEEN 1 AND 9999)) AND (${t.usageLimit} IS NULL OR ${t.usageLimit} > 0) AND (${t.startsAt} IS NULL OR ${t.expiresAt} IS NULL OR ${t.startsAt} < ${t.expiresAt}) AND length(${t.campaignName}) BETWEEN 1 AND 120 AND length(${t.sourceName}) BETWEEN 1 AND 120 AND ${t.sourceType} IN ('influencer','partner','institution','founder','organic_campaign','internal','other') AND ${t.version} > 0`),
]);
export const workspaceCouponPlans = pgTable('workspace_coupon_plans', {
  couponId: uuid('coupon_id').notNull().references(() => workspaceCoupons.id, { onDelete: 'restrict' }), planCode: text('plan_code').$type<PlanCode>().notNull(),
}, t => [primaryKey({ columns: [t.couponId, t.planCode] }), check('workspace_coupon_plans_code_check', sql`${t.planCode} IN ('quarterly','half_yearly','yearly')`)]);

// Financial capture alone never grants Workspace capabilities; fulfillment has a separate ledger.
export const workspaceMembershipOrders = pgTable('workspace_membership_orders', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  eligibilityAttemptId: uuid('eligibility_attempt_id').notNull().references(() => workspaceEligibilityAttempts.id, { onDelete: 'restrict' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => workspaceMembershipPlans.id, { onDelete: 'restrict' }),
  settingsId: uuid('settings_id').notNull().references(() => workspaceEligibilitySettings.id, { onDelete: 'restrict' }),
  policyId: uuid('policy_id').notNull().references(() => workspacePolicyVersions.id, { onDelete: 'restrict' }),
  eligibilityValidUntil: timestamp('eligibility_valid_until', { withTimezone: true }).notNull(),
  purchaseKind: text('purchase_kind').default('initial').notNull(), planCode: text('plan_code').$type<PlanCode>().notNull(), planSnapshot: jsonb('plan_snapshot').$type<{ version: number; displayName: string }>().notNull(),
  basePricePaise: integer('base_price_paise').notNull(), discountPaise: integer('discount_paise').notNull(), taxableAmountPaise: integer('taxable_amount_paise').notNull(), gstRateBps: integer('gst_rate_bps').notNull(), gstAmountPaise: integer('gst_amount_paise').notNull(), totalPaise: integer('total_paise').notNull(), currency: text('currency').default('INR').notNull(), durationMonths: integer('duration_months').notNull(),
  quoteHash: text('quote_hash').notNull(), quoteVersion: text('quote_version').notNull(), pricingRuleVersion: text('pricing_rule_version').notNull(), membershipStartRuleVersion: text('membership_start_rule_version').notNull(),
  launchAt: timestamp('launch_at', { withTimezone: true }).notNull(), membershipStartRule: text('membership_start_rule').notNull(), contextHash: text('context_hash').notNull(),
  couponId: uuid('coupon_id').references(() => workspaceCoupons.id, { onDelete: 'restrict' }), couponCode: text('coupon_code'),
  couponSnapshot: jsonb('coupon_snapshot').$type<{ campaignName: string; sourceType: CouponDefinition['sourceType']; sourceName: string; discountType: CouponDefinition['discountType']; discountValue: number; version: number; usageLimit: number | null }>(),
  requestKey: uuid('request_key').notNull(), requestPayloadHash: text('request_payload_hash').notNull(), commercialPolicyVersion: text('commercial_policy_version').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  provider: text('provider').default('razorpay').notNull(), providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').default('test').notNull(), providerReceipt: text('provider_receipt').notNull(),
  providerSetupState: text('provider_setup_state').$type<SetupState>().default('creating').notNull(), providerCreateStartedAt: timestamp('provider_create_started_at', { withTimezone: true }), providerRequestCount: integer('provider_request_count').default(0).notNull(),
  providerOrderId: text('provider_order_id'), providerOrderCreatedAt: timestamp('provider_order_created_at', { withTimezone: true }), providerRecoveryCheckedAt: timestamp('provider_recovery_checked_at', { withTimezone: true }), providerRecoveryReason: text('provider_recovery_reason'), providerCreateFailureHash: text('provider_create_failure_hash'),
  financialState: text('financial_state').$type<FinancialState>().default('unpaid').notNull(), activationState: text('activation_state').$type<ActivationState>().default('pending_activation').notNull(), winningPaymentId: text('winning_payment_id'),
  fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }), paidAt: timestamp('paid_at', { withTimezone: true }), refundEligibleUntil: timestamp('refund_eligible_until', { withTimezone: true }), reviewReason: text('review_reason'), closedAt: timestamp('closed_at', { withTimezone: true }), closeReason: text('close_reason'), version: integer('version').default(1).notNull(),
}, t => [
  uniqueIndex('workspace_orders_user_request_idx').on(t.userId, t.requestKey),
  uniqueIndex('workspace_orders_unresolved_user_idx').on(t.userId).where(sql`${t.providerSetupState} <> 'closed' OR ${t.financialState} = 'captured'`),
  uniqueIndex('workspace_orders_receipt_idx').on(t.providerAccountId, t.providerMode, t.providerReceipt),
  uniqueIndex('workspace_orders_provider_order_idx').on(t.providerAccountId, t.providerMode, t.providerOrderId),
  uniqueIndex('workspace_orders_owner_idx').on(t.id, t.userId),
  uniqueIndex('workspace_orders_owner_coupon_idx').on(t.id, t.userId, t.couponId),
  uniqueIndex('workspace_orders_owner_provider_idx').on(t.id, t.userId, t.providerAccountId, t.providerMode, t.providerOrderId),
  index('workspace_orders_recovery_idx').on(t.providerSetupState, t.createdAt), index('workspace_orders_financial_idx').on(t.financialState, t.activationState, t.createdAt),
  check('workspace_orders_economics_check', sql`${t.basePricePaise} BETWEEN 1 AND 100000000 AND ${t.discountPaise} >= 0 AND ${t.discountPaise} < ${t.basePricePaise} AND ${t.taxableAmountPaise} = ${t.basePricePaise} - ${t.discountPaise} AND ${t.gstRateBps} = 1800 AND ${t.gstAmountPaise} = round(${t.taxableAmountPaise}::numeric * 1800 / 10000) AND ${t.totalPaise} = ${t.taxableAmountPaise} + ${t.gstAmountPaise} AND ${t.totalPaise} > 0 AND ${t.currency} = 'INR' AND ((${t.planCode} = 'quarterly' AND ${t.durationMonths} = 3) OR (${t.planCode} = 'half_yearly' AND ${t.durationMonths} = 6) OR (${t.planCode} = 'yearly' AND ${t.durationMonths} = 12))`),
  check('workspace_orders_context_check', sql`${t.purchaseKind} = 'initial' AND ${t.provider} = 'razorpay' AND ${t.providerMode} = 'test' AND ${t.commercialPolicyVersion} = 'workspace-test-noncommercial-v1' AND ${t.quoteHash} ~ '^[a-f0-9]{64}$' AND ${t.contextHash} ~ '^[a-f0-9]{64}$' AND ${t.requestPayloadHash} ~ '^[a-f0-9]{64}$' AND ${t.providerReceipt} ~ '^wso[a-f0-9]{32}$' AND length(${t.providerAccountId}) BETWEEN 1 AND 100 AND ${t.version} > 0 AND ((${t.couponId} IS NULL AND ${t.couponCode} IS NULL AND ${t.couponSnapshot} IS NULL AND ${t.discountPaise} = 0) OR (${t.couponId} IS NOT NULL AND ${t.couponCode} IS NOT NULL AND ${t.couponSnapshot} IS NOT NULL AND ${t.discountPaise} > 0))`),
  check('workspace_orders_fulfillment_check', sql`(${t.fulfilledAt} IS NULL AND ${t.activationState} <> 'fulfilled') OR (${t.fulfilledAt} IS NOT NULL AND ${t.activationState} IN ('fulfilled','held_for_review') AND ${t.financialState} = 'captured' AND ${t.paidAt} IS NOT NULL AND ${t.refundEligibleUntil} = ${t.paidAt} + interval '72 hours' AND ${t.fulfilledAt} >= ${t.paidAt})`),
  check('workspace_orders_state_check', sql`${t.providerSetupState} IN ('creating','ready','recovery_required','closed') AND ${t.financialState} IN ('unpaid','captured') AND ${t.activationState} IN ('pending_activation','held_for_review','fulfilled') AND (${t.providerCreateFailureHash} IS NULL OR ${t.providerCreateFailureHash} ~ '^[a-f0-9]{64}$') AND ${t.providerRequestCount} BETWEEN 0 AND 1 AND ((${t.providerRequestCount} = 0 AND ${t.providerCreateStartedAt} IS NULL AND ${t.providerOrderId} IS NULL) OR (${t.providerRequestCount} = 1 AND ${t.providerCreateStartedAt} IS NOT NULL)) AND ((${t.providerOrderId} IS NULL AND ${t.providerOrderCreatedAt} IS NULL) OR (${t.providerOrderId} IS NOT NULL AND ${t.providerOrderCreatedAt} IS NOT NULL AND ${t.providerOrderId} ~ '^order_[A-Za-z0-9]{6,80}$')) AND (${t.providerSetupState} <> 'ready' OR ${t.providerOrderId} IS NOT NULL) AND ((${t.financialState} = 'unpaid' AND ${t.winningPaymentId} IS NULL AND ${t.paidAt} IS NULL AND ${t.refundEligibleUntil} IS NULL) OR (${t.financialState} = 'captured' AND ${t.winningPaymentId} IS NOT NULL AND ((${t.paidAt} IS NOT NULL AND ${t.refundEligibleUntil} IS NOT NULL AND ${t.refundEligibleUntil} = ${t.paidAt} + interval '72 hours') OR (${t.paidAt} IS NULL AND ${t.refundEligibleUntil} IS NULL AND ${t.activationState} = 'held_for_review')))) AND (${t.activationState} <> 'held_for_review' OR ${t.reviewReason} IS NOT NULL) AND (${t.providerSetupState} <> 'closed' OR (${t.closedAt} IS NOT NULL AND ${t.closeReason} IS NOT NULL AND ${t.closeReason} IN ('never_submitted','provider_definitive_rejection')))`),
]);
export const workspaceCreatorProfiles = pgTable('workspace_creator_profiles', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: text('status').$type<'enabled' | 'suspended' | 'terminated'>().default('enabled').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), firstActivatedAt: timestamp('first_activated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex('workspace_creator_profiles_user_idx').on(t.userId), uniqueIndex('workspace_creator_profiles_owner_idx').on(t.id, t.userId),
  check('workspace_creator_profiles_activation_check', sql`${t.firstActivatedAt} = ${t.createdAt}`),
  check('workspace_creator_profiles_status_check', sql`${t.status} IN ('enabled','suspended','terminated')`)]);
export const workspaceMemberships = pgTable('workspace_memberships', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  creatorProfileId: uuid('creator_profile_id').notNull(), membershipOrderId: uuid('membership_order_id').notNull(),
  planVersionId: uuid('plan_version_id').notNull().references(() => workspaceMembershipPlans.id, { onDelete: 'restrict' }),
  durationMonths: integer('duration_months').notNull(), paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(), endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  accessGrantedAt: timestamp('access_granted_at', { withTimezone: true }).notNull(), fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [uniqueIndex('workspace_memberships_order_idx').on(t.membershipOrderId), index('workspace_memberships_user_term_idx').on(t.userId, t.endsAt),
  foreignKey({ columns: [t.creatorProfileId, t.userId], foreignColumns: [workspaceCreatorProfiles.id, workspaceCreatorProfiles.userId] }).onDelete('restrict'),
  foreignKey({ columns: [t.membershipOrderId, t.userId], foreignColumns: [workspaceMembershipOrders.id, workspaceMembershipOrders.userId] }).onDelete('restrict'),
  check('workspace_memberships_term_check', sql`${t.durationMonths} IN (3,6,12) AND ${t.startsAt} >= ${t.paidAt} AND ${t.endsAt} > ${t.startsAt} AND ${t.accessGrantedAt} = ${t.fulfilledAt} AND ${t.fulfilledAt} >= ${t.paidAt} AND ${t.createdAt} = ${t.fulfilledAt}`)]);
export const workspaceCouponRedemptions = pgTable('workspace_coupon_redemptions', {
  id: uuid('id').defaultRandom().primaryKey(), couponId: uuid('coupon_id').notNull().references(() => workspaceCoupons.id, { onDelete: 'restrict' }), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }), membershipOrderId: uuid('membership_order_id').notNull(),
  status: text('status').$type<ReservationState>().default('reserved').notNull(), reservedAt: timestamp('reserved_at', { withTimezone: true }).defaultNow().notNull(), checkoutDeadline: timestamp('checkout_deadline', { withTimezone: true }).notNull(), holdPolicyVersion: text('hold_policy_version').default('conservative-v1').notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }), releasedAt: timestamp('released_at', { withTimezone: true }), releaseReason: text('release_reason'), releaseEvidenceHash: text('release_evidence_hash'), releaseSource: text('release_source'),
}, t => [
  uniqueIndex('workspace_redemptions_order_idx').on(t.membershipOrderId), uniqueIndex('workspace_redemptions_user_coupon_idx').on(t.couponId, t.userId).where(sql`${t.status} IN ('reserved','redeemed')`), index('workspace_redemptions_capacity_idx').on(t.couponId, t.status),
  foreignKey({ columns: [t.membershipOrderId, t.userId, t.couponId], foreignColumns: [workspaceMembershipOrders.id, workspaceMembershipOrders.userId, workspaceMembershipOrders.couponId] }).onDelete('restrict'),
  check('workspace_redemptions_state_check', sql`${t.holdPolicyVersion} = 'conservative-v1' AND ${t.checkoutDeadline} > ${t.reservedAt} AND ((${t.status} = 'reserved' AND ${t.redeemedAt} IS NULL AND ${t.releasedAt} IS NULL AND ${t.releaseReason} IS NULL AND ${t.releaseEvidenceHash} IS NULL AND ${t.releaseSource} IS NULL) OR (${t.status} = 'redeemed' AND ${t.redeemedAt} IS NOT NULL AND ${t.redeemedAt} >= ${t.reservedAt} AND ${t.releasedAt} IS NULL AND ${t.releaseReason} IS NULL AND ${t.releaseEvidenceHash} IS NULL AND ${t.releaseSource} IS NULL) OR (${t.status} = 'released' AND ${t.redeemedAt} IS NULL AND ${t.releasedAt} IS NOT NULL AND ${t.releasedAt} >= ${t.reservedAt} AND ${t.releaseReason} IS NOT NULL AND ${t.releaseReason} IN ('never_submitted','provider_definitive_rejection') AND ${t.releaseEvidenceHash} IS NOT NULL AND ${t.releaseEvidenceHash} ~ '^[a-f0-9]{64}$' AND ${t.releaseSource} IS NOT NULL AND ${t.releaseSource} = 'system'))`),
]);
export const workspacePaymentAttempts = pgTable('workspace_payment_attempts', {
  id: uuid('id').defaultRandom().primaryKey(), membershipOrderId: uuid('membership_order_id').notNull(), userId: uuid('user_id').notNull(), providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').notNull(), providerOrderId: text('provider_order_id').notNull(), providerPaymentId: text('provider_payment_id').notNull(),
  amountPaise: integer('amount_paise').notNull(), currency: text('currency').notNull(), state: text('state').$type<PaymentState>().notNull(), winner: boolean('winner').default(false).notNull(), observedAt: timestamp('observed_at', { withTimezone: true }).defaultNow().notNull(), lastObservedAt: timestamp('last_observed_at', { withTimezone: true }).notNull(), providerCreatedAt: timestamp('provider_created_at', { withTimezone: true }).notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }), captureTimeSource: text('capture_time_source'), refundedPaise: integer('refunded_paise').default(0).notNull(), evidenceHash: text('evidence_hash').notNull(),
}, t => [
  uniqueIndex('workspace_payments_provider_id_idx').on(t.providerAccountId, t.providerMode, t.providerPaymentId), uniqueIndex('workspace_payments_winner_idx').on(t.membershipOrderId).where(sql`${t.winner} = true`), index('workspace_payments_order_idx').on(t.membershipOrderId, t.observedAt),
  foreignKey({ columns: [t.membershipOrderId, t.userId, t.providerAccountId, t.providerMode, t.providerOrderId], foreignColumns: [workspaceMembershipOrders.id, workspaceMembershipOrders.userId, workspaceMembershipOrders.providerAccountId, workspaceMembershipOrders.providerMode, workspaceMembershipOrders.providerOrderId] }).onDelete('restrict'),
  check('workspace_payments_definition_check', sql`${t.providerMode} = 'test' AND ${t.providerPaymentId} ~ '^pay_[A-Za-z0-9]{6,80}$' AND ${t.providerOrderId} ~ '^order_[A-Za-z0-9]{6,80}$' AND ${t.amountPaise} > 0 AND ${t.currency} ~ '^[A-Z]{3}$' AND ${t.state} IN ('created','authorized','failed','captured') AND ${t.refundedPaise} BETWEEN 0 AND ${t.amountPaise} AND ${t.evidenceHash} ~ '^[a-f0-9]{64}$' AND (${t.winner} = false OR ${t.state} = 'captured') AND ((${t.capturedAt} IS NULL AND ${t.captureTimeSource} IS NULL) OR (${t.capturedAt} IS NOT NULL AND ${t.captureTimeSource} IS NOT NULL AND ${t.capturedAt} >= ${t.providerCreatedAt} AND ${t.state} = 'captured' AND ${t.captureTimeSource} = 'test_authoritative'))`),
]);
export const workspacePaymentEvents = pgTable('workspace_payment_events', {
  id: uuid('id').defaultRandom().primaryKey(), providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').notNull(), eventId: text('event_id').notNull(), eventType: text('event_type').notNull(), payloadHash: text('payload_hash').notNull(), evidence: jsonb('evidence').$type<WebhookEvidence>().notNull(), receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processingState: text('processing_state').$type<EventState>().default('pending').notNull(), processedAt: timestamp('processed_at', { withTimezone: true }), leaseUntil: timestamp('lease_until', { withTimezone: true }), nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }), attemptCount: integer('attempt_count').default(0).notNull(), lastErrorCode: text('last_error_code'), anomalyHash: text('anomaly_hash'), membershipOrderId: uuid('membership_order_id').references(() => workspaceMembershipOrders.id, { onDelete: 'restrict' }),
}, t => [
  uniqueIndex('workspace_events_provider_event_idx').on(t.providerAccountId, t.providerMode, t.eventId), index('workspace_events_pending_idx').on(t.processingState, t.nextAttemptAt, t.receivedAt),
  check('workspace_events_definition_check', sql`${t.providerMode} = 'test' AND length(${t.eventId}) BETWEEN 1 AND 100 AND ${t.eventType} ~ '^[a-z][a-z._]{1,79}$' AND ${t.payloadHash} ~ '^[a-f0-9]{64}$' AND (${t.anomalyHash} IS NULL OR ${t.anomalyHash} ~ '^[a-f0-9]{64}$') AND ${t.processingState} IN ('pending','processing','retry','processed','needs_review','ignored') AND ${t.attemptCount} BETWEEN 0 AND 100 AND ((${t.processingState} IN ('processed','ignored','needs_review') AND ${t.processedAt} IS NOT NULL) OR (${t.processingState} IN ('pending','processing','retry') AND ${t.processedAt} IS NULL))`),
]);

// Private Workspace content. Never participates in LMS storefront/ownership tables.
export const workspaceCreatorProfileDetails = pgTable('workspace_creator_profile_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  creatorProfileId: uuid('creator_profile_id').notNull(),
  displayName: text('display_name').notNull(),
  professionalHeadline: text('professional_headline').default('').notNull(),
  shortBio: text('short_bio').default('').notNull(),
  primaryAviationCategory: text('primary_aviation_category').notNull(),
  professionalProfileUrl: text('professional_profile_url'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_profile_details_owner_idx').on(t.userId),
  uniqueIndex('workspace_profile_details_profile_idx').on(t.creatorProfileId),
  foreignKey({ columns: [t.creatorProfileId, t.userId], foreignColumns: [workspaceCreatorProfiles.id, workspaceCreatorProfiles.userId], name: 'workspace_profile_details_owner_fk' }).onDelete('restrict'),
  check('workspace_profile_details_category_check', sql`${t.primaryAviationCategory} IN (${sql.raw(CATEGORIES.map(([code]) => `'${code}'`).join(', '))})`),
  check('workspace_profile_details_version_check', sql`${t.version} > 0`),
  check('workspace_profile_details_time_check', sql`${t.updatedAt} >= ${t.createdAt}`),
  check('workspace_profile_details_content_check', sql`length(${t.displayName}) BETWEEN 2 AND 100 AND length(${t.professionalHeadline}) <= 160 AND length(${t.shortBio}) <= 1000 AND (${t.professionalProfileUrl} IS NULL OR (length(${t.professionalProfileUrl}) <= 2048 AND ${t.professionalProfileUrl} LIKE 'https://%'))`),
]);
export const workspaceCourseDrafts = pgTable('workspace_course_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  creatorProfileId: uuid('creator_profile_id').notNull(),
  requestKey: uuid('request_key').notNull(),
  creationHash: text('creation_hash').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  targetLearner: text('target_learner').notNull(),
  learningOutcomes: jsonb('learning_outcomes').$type<string[]>().notNull(),
  outline: jsonb('outline').$type<import('@/lib/workspace/creator/model').OutlineItem[]>().notNull(),
  tentativePricePaise: integer('tentative_price_paise'),
  currency: text('currency').default('INR').notNull(),
  status: text('status').$type<'draft'>().default('draft').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_drafts_request_owner_idx').on(t.userId, t.requestKey),
  index('workspace_drafts_owner_updated_idx').on(t.userId, t.updatedAt, t.id),
  foreignKey({ columns: [t.creatorProfileId, t.userId], foreignColumns: [workspaceCreatorProfiles.id, workspaceCreatorProfiles.userId], name: 'workspace_drafts_owner_fk' }).onDelete('restrict'),
  check('workspace_drafts_category_check', sql`${t.category} IN (${sql.raw(CATEGORIES.map(([code]) => `'${code}'`).join(', '))})`),
  check('workspace_drafts_status_check', sql`${t.status} = 'draft' AND ${t.currency} = 'INR'`),
  check('workspace_drafts_version_time_check', sql`${t.version} > 0 AND ${t.updatedAt} >= ${t.createdAt}`),
  check('workspace_drafts_price_check', sql`${t.tentativePricePaise} IS NULL OR ${t.tentativePricePaise} BETWEEN 1 AND 100000000`),
  check('workspace_drafts_text_check', sql`length(${t.title}) BETWEEN 3 AND 200 AND length(${t.description}) BETWEEN 50 AND 5000 AND length(${t.targetLearner}) BETWEEN 1 AND 1000 AND ${t.creationHash} ~ '^[a-f0-9]{64}$'`),
  check('workspace_drafts_json_check', sql`CASE WHEN jsonb_typeof(${t.learningOutcomes}) = 'array' AND jsonb_typeof(${t.outline}) = 'array' THEN jsonb_array_length(${t.learningOutcomes}) BETWEEN 1 AND 10 AND jsonb_array_length(${t.outline}) <= 20 ELSE false END`),
]);
