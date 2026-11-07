import { CATEGORIES } from '@/lib/workspace/eligibility/model';
import { pgTable, pgEnum, bigint, uuid, text, numeric, boolean, integer, timestamp, uniqueIndex, unique, index, jsonb, check, primaryKey, foreignKey } from 'drizzle-orm/pg-core';
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
  category: text('category').default('general').notNull(),
  difficulty: text('difficulty').default('all_levels').notNull(),
  instructorId: uuid('instructor_id').references(() => users.id),
  workspaceProjectId: uuid('workspace_project_id').references(() => workspaceCourseProjects.id, { onDelete: 'restrict' }).unique(),
  workspaceState: text('workspace_state').$type<'live'|'unpublished'|'suspended'>(),
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
  workspaceRetired: boolean('workspace_retired').default(false).notNull(),
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
  workspaceRevisionId: uuid('workspace_revision_id').references(() => workspacePublicationRevisions.id, { onDelete: 'restrict' }),
  workspaceRetired: boolean('workspace_retired').default(false).notNull(),
  contentFormat: text('content_format').$type<'plain_text'|'markdown'>().default('markdown').notNull(),
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
  purchaseEvidence: jsonb('purchase_evidence').$type<import('@/lib/commerce/model').PurchaseEvidence>(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'restrict' }),
  workspacePriceId: uuid('workspace_price_id').references(() => workspacePublicationPrices.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('orders_paid_origin_idx').on(t.userId, t.courseId).where(sql`${t.status} IN ('paid','refunded','chargeback') AND ${t.razorpayPaymentId} IS NOT NULL AND ${t.amount}>0`)]);

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
  discoveryStats: one(courseDiscoveryStats, { fields: [courses.id], references: [courseDiscoveryStats.courseId] }),
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
export const workspaceInfluencers = pgTable('workspace_influencers', {
  id: uuid('id').primaryKey(), displayName: text('display_name').notNull(), description: text('description'),
  status: text('status').$type<'active' | 'inactive'>().default('active').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  updatedBy: uuid('updated_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), version: integer('version').default(1).notNull(),
}, t => [check('workspace_influencer_definition_check', sql`length(${t.displayName}) BETWEEN 1 AND 120 AND (${t.description} IS NULL OR length(${t.description}) BETWEEN 1 AND 500) AND ${t.status} IN ('active','inactive') AND ${t.version}>0`)]);
export const workspaceInfluencerHistory = pgTable('workspace_influencer_history', {
  id: uuid('id').defaultRandom().primaryKey(), influencerId: uuid('influencer_id').notNull().references(() => workspaceInfluencers.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }), version: integer('version').notNull(),
  snapshot: jsonb('snapshot').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [unique('workspace_influencer_history_version_unique').on(t.influencerId, t.version)]);
export const workspaceCoupons = pgTable('workspace_coupons', {
  id: uuid('id').defaultRandom().primaryKey(), influencerId: uuid('influencer_id').references(() => workspaceInfluencers.id, { onDelete: 'restrict' }), scope: text('scope').default('workspace_membership').notNull(), code: text('code').notNull(),
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

// Source-controlled contractual catalogue. Content is append-only; only current selection can change.
export const workspaceCreatorTermsVersions = pgTable('workspace_creator_terms_versions', {
  termsVersion: text('terms_version').primaryKey(), contentHash: text('content_hash').notNull(),
  canonicalContent: text('canonical_content').notNull(), effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
  isCurrent: boolean('is_current').default(false).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  unique('workspace_terms_version_hash_unique').on(t.termsVersion, t.contentHash),
  uniqueIndex('workspace_terms_current_idx').on(t.isCurrent).where(sql`${t.isCurrent}`),
  check('workspace_terms_content_check', sql`${t.termsVersion} ~ '^workspace_creator_terms_[a-zA-Z0-9_]+$' AND ${t.contentHash} = encode(sha256(convert_to(${t.canonicalContent}, 'UTF8')), 'hex')`),
]);
export const workspaceCreatorTermsAcceptances = pgTable('workspace_creator_terms_acceptances', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  termsVersion: text('terms_version').notNull(), termsContentHash: text('terms_content_hash').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, t => [
  unique('workspace_terms_user_version_unique').on(t.userId, t.termsVersion),
  unique('workspace_terms_acceptance_snapshot_unique').on(t.id, t.userId, t.termsVersion, t.termsContentHash, t.acceptedAt),
  foreignKey({ columns: [t.termsVersion, t.termsContentHash], foreignColumns: [workspaceCreatorTermsVersions.termsVersion, workspaceCreatorTermsVersions.contentHash], name: 'workspace_terms_acceptance_document_fk' }).onDelete('restrict'),
  check('workspace_terms_acceptance_time_check', sql`${t.acceptedAt} = ${t.createdAt}`),
]);

export const workspaceRefundPolicyVersions = pgTable('workspace_refund_policy_versions', {
  policyVersion: text('policy_version').primaryKey(), contentHash: text('content_hash').notNull(),
  canonicalContent: text('canonical_content').notNull(), effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
  isCurrent: boolean('is_current').default(false).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  unique('workspace_policy_version_hash_unique').on(t.policyVersion, t.contentHash),
  uniqueIndex('workspace_refund_policy_current_idx').on(t.isCurrent).where(sql`${t.isCurrent}`),
  check('workspace_refund_policy_content_check', sql`${t.policyVersion} ~ '^workspace_refund_policy_[a-zA-Z0-9_]+$' AND ${t.contentHash} = encode(sha256(convert_to(${t.canonicalContent}, 'UTF8')), 'hex')`),
]);
export const workspaceRefundPolicyAcceptances = pgTable('workspace_refund_policy_acceptances', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  policyVersion: text('policy_version').notNull(), policyContentHash: text('policy_content_hash').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, t => [
  unique('workspace_refund_policy_user_version_unique').on(t.userId, t.policyVersion),
  unique('workspace_refund_policy_acceptance_snapshot_unique').on(t.id, t.userId, t.policyVersion, t.policyContentHash, t.acceptedAt),
  foreignKey({ columns: [t.policyVersion, t.policyContentHash], foreignColumns: [workspaceRefundPolicyVersions.policyVersion, workspaceRefundPolicyVersions.contentHash], name: 'workspace_refund_policy_acceptance_document_fk' }).onDelete('restrict'),
  check('workspace_refund_policy_acceptance_time_check', sql`${t.acceptedAt} = ${t.createdAt}`),
]);

// Financial capture alone never grants Workspace capabilities; fulfillment has a separate ledger.
export const workspaceMembershipOrders = pgTable('workspace_membership_orders', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  eligibilityAttemptId: uuid('eligibility_attempt_id').notNull().references(() => workspaceEligibilityAttempts.id, { onDelete: 'restrict' }),
  planVersionId: uuid('plan_version_id').notNull().references(() => workspaceMembershipPlans.id, { onDelete: 'restrict' }),
  settingsId: uuid('settings_id').notNull().references(() => workspaceEligibilitySettings.id, { onDelete: 'restrict' }),
  policyId: uuid('policy_id').notNull().references(() => workspacePolicyVersions.id, { onDelete: 'restrict' }),
  creatorTermsAcceptanceId: uuid('creator_terms_acceptance_id'), creatorTermsVersion: text('creator_terms_version'), creatorTermsContentHash: text('creator_terms_content_hash'), creatorTermsAcceptedAt: timestamp('creator_terms_accepted_at', { withTimezone: true }),
  refundPolicyAcceptanceId: uuid('refund_policy_acceptance_id'), refundPolicyVersion: text('refund_policy_version'), refundPolicyContentHash: text('refund_policy_content_hash'), refundPolicyAcceptedAt: timestamp('refund_policy_accepted_at', { withTimezone: true }),
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
  foreignKey({ columns: [t.creatorTermsAcceptanceId, t.userId, t.creatorTermsVersion, t.creatorTermsContentHash, t.creatorTermsAcceptedAt], foreignColumns: [workspaceCreatorTermsAcceptances.id, workspaceCreatorTermsAcceptances.userId, workspaceCreatorTermsAcceptances.termsVersion, workspaceCreatorTermsAcceptances.termsContentHash, workspaceCreatorTermsAcceptances.acceptedAt], name: 'workspace_orders_terms_snapshot_fk' }).onDelete('restrict'),
  check('workspace_orders_terms_snapshot_check', sql`(${t.creatorTermsAcceptanceId} IS NULL AND ${t.creatorTermsVersion} IS NULL AND ${t.creatorTermsContentHash} IS NULL AND ${t.creatorTermsAcceptedAt} IS NULL) OR (${t.creatorTermsAcceptanceId} IS NOT NULL AND ${t.creatorTermsVersion} IS NOT NULL AND ${t.creatorTermsContentHash} IS NOT NULL AND ${t.creatorTermsAcceptedAt} IS NOT NULL AND ${t.creatorTermsAcceptedAt} <= ${t.createdAt})`),
  foreignKey({ columns: [t.refundPolicyAcceptanceId, t.userId, t.refundPolicyVersion, t.refundPolicyContentHash, t.refundPolicyAcceptedAt], foreignColumns: [workspaceRefundPolicyAcceptances.id, workspaceRefundPolicyAcceptances.userId, workspaceRefundPolicyAcceptances.policyVersion, workspaceRefundPolicyAcceptances.policyContentHash, workspaceRefundPolicyAcceptances.acceptedAt], name: 'workspace_orders_refund_policy_snapshot_fk' }).onDelete('restrict'),
  check('workspace_orders_refund_policy_snapshot_check', sql`(${t.refundPolicyAcceptanceId} IS NULL AND ${t.refundPolicyVersion} IS NULL AND ${t.refundPolicyContentHash} IS NULL AND ${t.refundPolicyAcceptedAt} IS NULL) OR (${t.refundPolicyAcceptanceId} IS NOT NULL AND ${t.refundPolicyVersion} IS NOT NULL AND ${t.refundPolicyContentHash} IS NOT NULL AND ${t.refundPolicyAcceptedAt} IS NOT NULL AND ${t.refundPolicyAcceptedAt} <= ${t.createdAt})`),
  uniqueIndex('workspace_orders_unresolved_user_idx').on(t.userId).where(sql`${t.providerSetupState} <> 'closed' OR ${t.financialState} = 'captured'`),
  uniqueIndex('workspace_orders_receipt_idx').on(t.providerAccountId, t.providerMode, t.providerReceipt),
  uniqueIndex('workspace_orders_provider_order_idx').on(t.providerAccountId, t.providerMode, t.providerOrderId),
  uniqueIndex('workspace_orders_owner_idx').on(t.id, t.userId),
  uniqueIndex('workspace_orders_owner_coupon_idx').on(t.id, t.userId, t.couponId),
  uniqueIndex('workspace_orders_owner_provider_idx').on(t.id, t.userId, t.providerAccountId, t.providerMode, t.providerOrderId),
  index('workspace_orders_recovery_idx').on(t.providerSetupState, t.createdAt), index('workspace_orders_financial_idx').on(t.financialState, t.activationState, t.createdAt),
  check('workspace_orders_economics_check', sql`${t.basePricePaise} BETWEEN 1 AND 100000000 AND ${t.discountPaise} >= 0 AND ${t.discountPaise} < ${t.basePricePaise} AND ${t.taxableAmountPaise} = ${t.basePricePaise} - ${t.discountPaise} AND ${t.gstRateBps} = 1800 AND ${t.gstAmountPaise} = round(${t.taxableAmountPaise}::numeric * 1800 / 10000) AND ${t.totalPaise} = ${t.taxableAmountPaise} + ${t.gstAmountPaise} AND ${t.totalPaise} > 0 AND ${t.currency} = 'INR' AND ((${t.planCode} = 'quarterly' AND ${t.durationMonths} = 3) OR (${t.planCode} = 'half_yearly' AND ${t.durationMonths} = 6) OR (${t.planCode} = 'yearly' AND ${t.durationMonths} = 12))`),
  check('workspace_orders_context_check', sql`${t.purchaseKind} = 'initial' AND ${t.provider} = 'razorpay' AND ((${t.providerMode} = 'test' AND ${t.commercialPolicyVersion} = 'workspace-test-noncommercial-v1') OR (${t.providerMode} = 'live' AND ${t.commercialPolicyVersion} = 'workspace-live-commercial-v1')) AND ${t.quoteHash} ~ '^[a-f0-9]{64}$' AND ${t.contextHash} ~ '^[a-f0-9]{64}$' AND ${t.requestPayloadHash} ~ '^[a-f0-9]{64}$' AND ${t.providerReceipt} ~ '^wso[a-f0-9]{32}$' AND length(${t.providerAccountId}) BETWEEN 1 AND 100 AND ${t.version} > 0 AND ((${t.couponId} IS NULL AND ${t.couponCode} IS NULL AND ${t.couponSnapshot} IS NULL AND ${t.discountPaise} = 0) OR (${t.couponId} IS NOT NULL AND ${t.couponCode} IS NOT NULL AND ${t.couponSnapshot} IS NOT NULL AND ${t.discountPaise} > 0))`),
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
  check('workspace_payments_definition_check', sql`${t.providerMode} IN ('test','live') AND ${t.providerPaymentId} ~ '^pay_[A-Za-z0-9]{6,80}$' AND ${t.providerOrderId} ~ '^order_[A-Za-z0-9]{6,80}$' AND ${t.amountPaise} > 0 AND ${t.currency} ~ '^[A-Z]{3}$' AND ${t.state} IN ('created','authorized','failed','captured') AND ${t.refundedPaise} BETWEEN 0 AND ${t.amountPaise} AND ${t.evidenceHash} ~ '^[a-f0-9]{64}$' AND (${t.winner} = false OR ${t.state} = 'captured') AND ((${t.capturedAt} IS NULL AND ${t.captureTimeSource} IS NULL) OR (${t.capturedAt} IS NOT NULL AND ${t.captureTimeSource} IS NOT NULL AND ${t.capturedAt} >= ${t.providerCreatedAt} AND ${t.state} = 'captured' AND (${t.captureTimeSource} = 'razorpay_payment_captured_event_v1' OR (${t.providerMode} = 'test' AND ${t.captureTimeSource} = 'test_authoritative'))))`),
]);
export const workspacePaymentEvents = pgTable('workspace_payment_events', {
  id: uuid('id').defaultRandom().primaryKey(), providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').notNull(), eventId: text('event_id').notNull(), eventType: text('event_type').notNull(), payloadHash: text('payload_hash').notNull(), evidence: jsonb('evidence').$type<WebhookEvidence>().notNull(), receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
  processingState: text('processing_state').$type<EventState>().default('pending').notNull(), processedAt: timestamp('processed_at', { withTimezone: true }), leaseUntil: timestamp('lease_until', { withTimezone: true }), nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }), attemptCount: integer('attempt_count').default(0).notNull(), lastErrorCode: text('last_error_code'), anomalyHash: text('anomaly_hash'), membershipOrderId: uuid('membership_order_id').references(() => workspaceMembershipOrders.id, { onDelete: 'restrict' }),
}, t => [
  uniqueIndex('workspace_events_provider_event_idx').on(t.providerAccountId, t.providerMode, t.eventId), index('workspace_events_pending_idx').on(t.processingState, t.nextAttemptAt, t.receivedAt),
  check('workspace_events_definition_check', sql`${t.providerMode} IN ('test','live') AND length(${t.eventId}) BETWEEN 1 AND 100 AND ${t.eventType} ~ '^[a-z][a-z._]{1,79}$' AND ${t.payloadHash} ~ '^[a-f0-9]{64}$' AND (${t.anomalyHash} IS NULL OR ${t.anomalyHash} ~ '^[a-f0-9]{64}$') AND ${t.processingState} IN ('pending','processing','retry','processed','needs_review','ignored') AND ${t.attemptCount} BETWEEN 0 AND 100 AND ((${t.processingState} IN ('processed','ignored','needs_review') AND ${t.processedAt} IS NOT NULL) OR (${t.processingState} IN ('pending','processing','retry') AND ${t.processedAt} IS NULL))`),
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
  uniqueIndex('workspace_drafts_composite_owner_idx').on(t.id, t.userId, t.creatorProfileId),
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

// Private review evidence; approval is not an LMS publication or entitlement.
export const workspaceCourseSubmissions = pgTable('workspace_course_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  draftId: uuid('draft_id').notNull(),
  userId: uuid('user_id').notNull(),
  creatorProfileId: uuid('creator_profile_id').notNull(),
  submissionNumber: integer('submission_number').notNull(),
  draftVersion: integer('draft_version').notNull(),
  contentHash: text('content_hash').notNull(),
  requestKey: uuid('request_key').notNull(),
  commandHash: text('command_hash').notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  targetLearner: text('target_learner').notNull(),
  learningOutcomes: jsonb('learning_outcomes').$type<string[]>().notNull(),
  outline: jsonb('outline').$type<import('@/lib/workspace/creator/model').OutlineItem[]>().notNull(),
  tentativePricePaise: integer('tentative_price_paise'),
  currency: text('currency').default('INR').notNull(),
  reviewStatus: text('review_status').$type<import('@/lib/workspace/review/model').ReviewStatus>().default('submitted').notNull(),
  version: integer('version').default(1).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  reviewStartedAt: timestamp('review_started_at', { withTimezone: true }),
  reviewCompletedAt: timestamp('review_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  foreignKey({ columns: [t.draftId, t.userId, t.creatorProfileId], foreignColumns: [workspaceCourseDrafts.id, workspaceCourseDrafts.userId, workspaceCourseDrafts.creatorProfileId], name: 'workspace_submissions_draft_owner_fk' }).onDelete('restrict'),
  uniqueIndex('workspace_submissions_build_owner_idx').on(t.id, t.userId, t.creatorProfileId, t.draftId),
  uniqueIndex('workspace_submissions_number_idx').on(t.draftId, t.submissionNumber),
  uniqueIndex('workspace_submissions_request_idx').on(t.userId, t.requestKey),
  uniqueIndex('workspace_submissions_open_idx').on(t.draftId).where(sql`${t.reviewStatus} IN ('submitted', 'under_review')`),
  index('workspace_submissions_queue_idx').on(t.reviewStatus, t.submittedAt, t.id),
  index('workspace_submissions_owner_idx').on(t.userId, t.draftId, t.submissionNumber),
  check('workspace_submissions_identity_check', sql`${t.submissionNumber} > 0 AND ${t.draftVersion} > 0 AND ${t.contentHash} ~ '^[a-f0-9]{64}$' AND ${t.commandHash} ~ '^[a-f0-9]{64}$'`),
  check('workspace_submissions_category_check', sql`${t.category} IN (${sql.raw(CATEGORIES.map(([code]) => `'${code}'`).join(', '))})`),
  check('workspace_submissions_content_check', sql`${t.currency} = 'INR' AND length(${t.title}) BETWEEN 3 AND 200 AND length(${t.description}) BETWEEN 50 AND 5000 AND length(${t.targetLearner}) BETWEEN 1 AND 1000 AND (${t.tentativePricePaise} IS NULL OR ${t.tentativePricePaise} BETWEEN 1 AND 100000000)`),
  check('workspace_submissions_json_check', sql`CASE WHEN jsonb_typeof(${t.learningOutcomes}) = 'array' AND jsonb_typeof(${t.outline}) = 'array' THEN jsonb_array_length(${t.learningOutcomes}) BETWEEN 1 AND 10 AND jsonb_array_length(${t.outline}) <= 20 ELSE false END`),
  check('workspace_submissions_lifecycle_check', sql`${t.createdAt} = ${t.submittedAt} AND ${t.updatedAt} >= ${t.submittedAt} AND ((${t.reviewStatus} = 'submitted' AND ${t.version} = 1 AND ${t.reviewStartedAt} IS NULL AND ${t.reviewCompletedAt} IS NULL AND ${t.updatedAt} = ${t.submittedAt}) OR (${t.reviewStatus} = 'under_review' AND ${t.version} = 2 AND ${t.reviewStartedAt} IS NOT NULL AND ${t.reviewStartedAt} >= ${t.submittedAt} AND ${t.reviewCompletedAt} IS NULL AND ${t.updatedAt} = ${t.reviewStartedAt}) OR (${t.reviewStatus} IN ('changes_requested', 'approved') AND ${t.version} = 3 AND ${t.reviewStartedAt} IS NOT NULL AND ${t.reviewStartedAt} >= ${t.submittedAt} AND ${t.reviewCompletedAt} IS NOT NULL AND ${t.reviewCompletedAt} >= ${t.reviewStartedAt} AND ${t.updatedAt} = ${t.reviewCompletedAt}))`),
]);
export const workspaceCourseReviewEvents = pgTable('workspace_course_review_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: uuid('submission_id').notNull().references(() => workspaceCourseSubmissions.id, { onDelete: 'restrict' }),
  actorAdminUserId: uuid('actor_admin_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: text('action').$type<'review_started' | 'changes_requested' | 'approved'>().notNull(),
  fromStatus: text('from_status').$type<import('@/lib/workspace/review/model').ReviewStatus>().notNull(),
  toStatus: text('to_status').$type<import('@/lib/workspace/review/model').ReviewStatus>().notNull(),
  transitionVersion: integer('transition_version').notNull(),
  feedback: text('feedback'),
  note: text('note'),
  requestKey: uuid('request_key').notNull(),
  commandHash: text('command_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_review_events_request_idx').on(t.actorAdminUserId, t.requestKey),
  uniqueIndex('workspace_review_events_transition_idx').on(t.submissionId, t.transitionVersion),
  check('workspace_review_events_hash_check', sql`${t.commandHash} ~ '^[a-f0-9]{64}$'`),
  check('workspace_review_events_transition_check', sql`(${t.action} = 'review_started' AND ${t.fromStatus} = 'submitted' AND ${t.toStatus} = 'under_review' AND ${t.transitionVersion} = 2 AND ${t.feedback} IS NULL AND ${t.note} IS NULL) OR (${t.action} = 'changes_requested' AND ${t.fromStatus} = 'under_review' AND ${t.toStatus} = 'changes_requested' AND ${t.transitionVersion} = 3 AND ${t.feedback} IS NOT NULL AND length(btrim(${t.feedback})) BETWEEN 10 AND 2000 AND ${t.note} IS NULL) OR (${t.action} = 'approved' AND ${t.fromStatus} = 'under_review' AND ${t.toStatus} = 'approved' AND ${t.transitionVersion} = 3 AND ${t.feedback} IS NULL AND (${t.note} IS NULL OR length(${t.note}) <= 1000))`),
  check('workspace_review_events_plain_check', sql`replace(replace(coalesce(${t.feedback}, ''), chr(10), ''), chr(9), '') !~ '[<>[:cntrl:]]' AND replace(replace(coalesce(${t.note}, ''), chr(10), ''), chr(9), '') !~ '[<>[:cntrl:]]'`),
]);

// Private approved-submission builder. No LMS/storefront/payment relationships.
export const workspaceCourseProjects = pgTable('workspace_course_projects', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull(), creatorProfileId: uuid('creator_profile_id').notNull(),
  draftId: uuid('draft_id').notNull(), approvedSubmissionId: uuid('approved_submission_id'),
  sourceSnapshot: jsonb('source_snapshot').$type<import('@/lib/workspace/builder/service').ApprovedSource>(),
  status: text('status').$type<'building'>().default('building').notNull(), version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_projects_media_owner_idx').on(t.id, t.userId, t.creatorProfileId),
  uniqueIndex('workspace_projects_source_idx').on(t.approvedSubmissionId), uniqueIndex('workspace_projects_owner_idx').on(t.id, t.userId),
  index('workspace_projects_draft_idx').on(t.userId, t.draftId),
  uniqueIndex('workspace_projects_direct_draft_idx').on(t.draftId).where(sql`${t.sourceSnapshot} IS NOT NULL`),
  foreignKey({columns:[t.draftId,t.userId,t.creatorProfileId],foreignColumns:[workspaceCourseDrafts.id,workspaceCourseDrafts.userId,workspaceCourseDrafts.creatorProfileId],name:'workspace_project_draft_owner_fk'}).onDelete('restrict'),
  check('workspace_project_source_check',sql`(${t.approvedSubmissionId} IS NOT NULL AND ${t.sourceSnapshot} IS NULL) OR (${t.approvedSubmissionId} IS NULL AND ${t.sourceSnapshot} IS NOT NULL)`),
  foreignKey({ columns: [t.approvedSubmissionId, t.userId, t.creatorProfileId, t.draftId], foreignColumns: [workspaceCourseSubmissions.id, workspaceCourseSubmissions.userId, workspaceCourseSubmissions.creatorProfileId, workspaceCourseSubmissions.draftId], name: 'workspace_projects_approved_owner_fk' }).onDelete('restrict'),
  foreignKey({ columns: [t.creatorProfileId, t.userId], foreignColumns: [workspaceCreatorProfiles.id, workspaceCreatorProfiles.userId], name: 'workspace_projects_profile_owner_fk' }).onDelete('restrict'),
  check('workspace_projects_state_check', sql`${t.status} = 'building' AND ${t.version} > 0 AND ${t.updatedAt} >= ${t.createdAt}`),
]);
export const workspaceCourseModules = pgTable('workspace_course_modules', {
  id: uuid('id').defaultRandom().primaryKey(), projectId: uuid('project_id').notNull(), userId: uuid('user_id').notNull(),
  title: text('title').notNull(), description: text('description').default('').notNull(), position: integer('position').notNull(), version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_modules_owner_idx').on(t.id, t.projectId, t.userId), unique('workspace_modules_position_unique').on(t.projectId, t.position),
  foreignKey({ columns: [t.projectId, t.userId], foreignColumns: [workspaceCourseProjects.id, workspaceCourseProjects.userId], name: 'workspace_modules_project_owner_fk' }).onDelete('restrict'),
  check('workspace_modules_content_check', sql`length(btrim(${t.title})) BETWEEN 2 AND 200 AND length(${t.description}) <= 1000`),
  check('workspace_modules_version_time_check', sql`${t.position} >= 0 AND ${t.version} > 0 AND ${t.updatedAt} >= ${t.createdAt}`),
]);
export const workspaceCourseLessons = pgTable('workspace_course_lessons', {
  id: uuid('id').defaultRandom().primaryKey(), projectId: uuid('project_id').notNull(), moduleId: uuid('module_id').notNull(), userId: uuid('user_id').notNull(),
  title: text('title').notNull(), summary: text('summary').default('').notNull(), content: text('content').default('').notNull(), position: integer('position').notNull(), version: integer('version').default(1).notNull(),
  contentFormat: text('content_format').$type<import('@/lib/workspace/media/model').ContentFormat>().default('plain_text').notNull(),
  mediaRevision: integer('media_revision').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  uniqueIndex('workspace_lessons_media_owner_idx').on(t.id, t.projectId, t.userId),
  check('workspace_lessons_format_media_check', sql`${t.contentFormat} IN ('plain_text','markdown') AND ${t.mediaRevision} BETWEEN 0 AND 2147483646`),
  unique('workspace_lessons_position_unique').on(t.moduleId, t.position),
  foreignKey({ columns: [t.moduleId, t.projectId, t.userId], foreignColumns: [workspaceCourseModules.id, workspaceCourseModules.projectId, workspaceCourseModules.userId], name: 'workspace_lessons_module_owner_fk' }).onDelete('restrict'),
  check('workspace_lessons_content_check', sql`length(btrim(${t.title})) BETWEEN 2 AND 200 AND length(${t.summary}) <= 1000 AND length(${t.content}) <= 20000`),
  check('workspace_lessons_version_time_check', sql`${t.position} >= 0 AND ${t.version} > 0 AND ${t.updatedAt} >= ${t.createdAt}`),
]);

// Private authoring assets. No learner course/video/enrollment relationship.
export const workspaceCourseAssets = pgTable('workspace_course_assets', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull(), creatorProfileId: uuid('creator_profile_id').notNull(),
  projectId: uuid('project_id').notNull(), lessonId: uuid('lesson_id'),
  assetKind: text('asset_kind').$type<import('@/lib/workspace/media/model').AssetKind>().notNull(),
  status: text('status').$type<import('@/lib/workspace/media/model').AssetState>().default('pending_upload').notNull(),
  filename: text('filename').notNull(), displayName: text('display_name').notNull(), mimeType: text('mime_type').notNull(), byteSize: bigint('byte_size', { mode: 'number' }).notNull(),
  storageProvider: text('storage_provider').$type<'s3'>().notNull(), storageContainer: text('storage_container').notNull(), storageAccountId: text('storage_account_id').notNull(), storageKey: text('storage_key').notNull(),
  objectVersionId: text('object_version_id'), checksum: text('checksum'), verificationPolicy: text('verification_policy'),
  processingJobId: text('processing_job_id'), processingSourceVersion: text('processing_source_version'), processingPolicy: text('processing_policy'),
  outputKey: text('output_key'), outputVersionId: text('output_version_id'),
  replacesAssetId: uuid('replaces_asset_id'), replacementVersion: integer('replacement_version'),
  captionVideoId: uuid('caption_video_id'), captionSourceVersion: text('caption_source_version'), language: text('language'),
  isAttached: boolean('is_attached').default(false).notNull(), resourcePosition: integer('resource_position'),
  requestKey: uuid('request_key').notNull(), contextHash: text('context_hash').notNull(), version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }), readyAt: timestamp('ready_at', { withTimezone: true }), detachedAt: timestamp('detached_at', { withTimezone: true }),
}, t => [
  check('workspace_asset_cover_scope',sql`${t.lessonId} IS NOT NULL OR (${t.assetKind}='resource' AND ${t.mimeType} IN ('image/png','image/jpeg') AND NOT ${t.isAttached})`),
  uniqueIndex('workspace_assets_owner_idx').on(t.id, t.lessonId, t.projectId, t.userId),
  uniqueIndex('workspace_assets_request_idx').on(t.userId, t.requestKey),
  uniqueIndex('workspace_assets_object_idx').on(t.storageProvider, t.storageContainer, t.storageKey),
  uniqueIndex('workspace_assets_video_current_idx').on(t.lessonId).where(sql`${t.assetKind}='video' AND ${t.isAttached}`),
  uniqueIndex('workspace_assets_video_pending_idx').on(t.lessonId).where(sql`${t.assetKind}='video' AND ${t.status} IN ('pending_upload','uploaded','verified','processing','ready') AND NOT ${t.isAttached}`),
  uniqueIndex('workspace_assets_replacement_version_idx').on(t.lessonId, t.replacementVersion),
  uniqueIndex('workspace_assets_caption_current_idx').on(t.captionVideoId, t.language).where(sql`${t.assetKind}='caption' AND ${t.isAttached}`),
  unique('workspace_assets_resource_position_unique').on(t.lessonId, t.resourcePosition),
  index('workspace_assets_lesson_idx').on(t.lessonId, t.createdAt, t.id),
  index('workspace_assets_operations_idx').on(t.status,t.updatedAt,t.expiresAt).where(sql`${t.status} IN ('pending_upload','processing','failed')`),
  foreignKey({ columns: [t.lessonId, t.projectId, t.userId], foreignColumns: [workspaceCourseLessons.id, workspaceCourseLessons.projectId, workspaceCourseLessons.userId], name: 'workspace_assets_lesson_owner_fk' }).onDelete('restrict'),
  foreignKey({ columns: [t.projectId, t.userId, t.creatorProfileId], foreignColumns: [workspaceCourseProjects.id, workspaceCourseProjects.userId, workspaceCourseProjects.creatorProfileId], name: 'workspace_assets_project_owner_fk' }).onDelete('restrict'),
  foreignKey({ columns: [t.replacesAssetId, t.lessonId, t.projectId, t.userId], foreignColumns: [t.id, t.lessonId, t.projectId, t.userId], name: 'workspace_assets_replaces_owner_fk' }).onDelete('restrict'),
  foreignKey({ columns: [t.captionVideoId, t.lessonId, t.projectId, t.userId], foreignColumns: [t.id, t.lessonId, t.projectId, t.userId], name: 'workspace_assets_caption_owner_fk' }).onDelete('restrict'),
  check('workspace_assets_file_check', sql`length(btrim(${t.filename})) BETWEEN 1 AND 180 AND length(btrim(${t.displayName})) BETWEEN 1 AND 180 AND ((${t.assetKind}='video' AND ${t.mimeType}='video/mp4' AND ${t.byteSize} BETWEEN 1 AND 2147483648) OR (${t.assetKind}='resource' AND ${t.mimeType} IN ('application/pdf','image/png','image/jpeg') AND ${t.byteSize} BETWEEN 1 AND 20971520) OR (${t.assetKind}='caption' AND ${t.mimeType}='text/vtt' AND ${t.byteSize} BETWEEN 1 AND 1048576))`),
  check('workspace_assets_storage_check', sql`${t.storageProvider}='s3' AND length(btrim(${t.storageContainer}))>0 AND ${t.storageAccountId} ~ '^[0-9]{12}$' AND ${t.storageKey}='workspace/'||${t.creatorProfileId}::text||'/'||${t.projectId}::text||'/'||${t.id}::text||'/source' AND ${t.contextHash} ~ '^[a-f0-9]{64}$'`),
  check('workspace_assets_kind_check', sql`((${t.assetKind}='video' AND ${t.replacementVersion} IS NOT NULL AND ${t.replacementVersion}>0) OR (${t.assetKind}<>'video' AND ${t.replacementVersion} IS NULL AND ${t.replacesAssetId} IS NULL)) AND ((${t.assetKind}='caption' AND ${t.captionVideoId} IS NOT NULL AND ${t.captionSourceVersion} IS NOT NULL AND length(${t.captionSourceVersion})>0 AND ${t.language} IS NOT NULL AND ${t.language} ~ '^[a-z]{2,3}(-[A-Z]{2})?$') OR (${t.assetKind}<>'caption' AND ${t.captionVideoId} IS NULL AND ${t.captionSourceVersion} IS NULL AND ${t.language} IS NULL))`),
  check('workspace_assets_state_check', sql`${t.status} IN ('pending_upload','uploaded','verified','processing','ready','failed','detached') AND (NOT ${t.isAttached} OR ${t.status}='ready') AND ((${t.assetKind}='resource' AND ${t.isAttached} AND ${t.resourcePosition} IS NOT NULL AND ${t.resourcePosition}>=0) OR (NOT (${t.assetKind}='resource' AND ${t.isAttached}) AND ${t.resourcePosition} IS NULL)) AND (${t.status}<>'processing' OR ${t.assetKind}='video')`),
  check('workspace_assets_evidence_check', sql`(${t.status} NOT IN ('uploaded','verified','processing','ready') OR (${t.objectVersionId} IS NOT NULL AND length(${t.objectVersionId})>0 AND ${t.objectVersionId}<>'null' AND ${t.uploadedAt} IS NOT NULL)) AND (${t.status} NOT IN ('verified','processing','ready') OR (${t.verifiedAt} IS NOT NULL AND ${t.checksum} IS NOT NULL AND ${t.checksum} ~ '^[a-f0-9]{64}$' AND ${t.verificationPolicy} IS NOT NULL AND length(${t.verificationPolicy})>0)) AND (${t.status}<>'ready' OR ${t.readyAt} IS NOT NULL) AND (${t.status}<>'detached' OR (${t.detachedAt} IS NOT NULL AND NOT ${t.isAttached})) AND (${t.status}<>'processing' AND NOT (${t.assetKind}='video' AND ${t.status}='ready') OR (${t.processingJobId} IS NOT NULL AND length(${t.processingJobId})>0 AND ${t.processingSourceVersion} IS NOT NULL AND ${t.processingSourceVersion}=${t.objectVersionId} AND ${t.processingPolicy} IS NOT NULL AND length(${t.processingPolicy})>0)) AND (${t.assetKind}<>'video' OR ${t.status}<>'ready' OR (${t.outputKey} IS NOT NULL AND ${t.outputVersionId} IS NOT NULL AND length(${t.outputVersionId})>0))`),
  check('workspace_assets_time_check', sql`${t.version} BETWEEN 1 AND 2147483646 AND ${t.updatedAt}>=${t.createdAt} AND ${t.expiresAt}>${t.createdAt} AND (${t.uploadedAt} IS NULL OR ${t.uploadedAt}>=${t.createdAt}) AND (${t.verifiedAt} IS NULL OR (${t.uploadedAt} IS NOT NULL AND ${t.verifiedAt}>=${t.uploadedAt})) AND (${t.readyAt} IS NULL OR (${t.verifiedAt} IS NOT NULL AND ${t.readyAt}>=${t.verifiedAt})) AND (${t.detachedAt} IS NULL OR ${t.detachedAt}>=${t.createdAt})`),
]);

// Decisions, execution and financial completion are separate; no historical membership mutation.
export const workspaceRefundRequests = pgTable('workspace_refund_requests', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }), membershipOrderId: uuid('membership_order_id').notNull(),
  requestKey: uuid('request_key').notNull(), payloadHash: text('payload_hash').notNull(), reason: text('reason').$type<import('@/lib/workspace/refunds/model').RefundReason>().notNull(), note: text('note'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull(), eligibilityDeadline: timestamp('eligibility_deadline', { withTimezone: true }).notNull(), amountPaise: integer('amount_paise').notNull(), currency: text('currency').notNull(),
  decision: text('decision').$type<import('@/lib/workspace/refunds/model').RefundDecision>().default('requested').notNull(), decidedBy: uuid('decided_by').references(() => users.id, { onDelete: 'restrict' }), decidedAt: timestamp('decided_at', { withTimezone: true }), rejectionReason: text('rejection_reason'), createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}, t => [unique('workspace_refund_request_order_unique').on(t.membershipOrderId), unique('workspace_refund_request_key_unique').on(t.userId, t.requestKey), unique('workspace_refund_request_owner_unique').on(t.id, t.membershipOrderId, t.userId),
  foreignKey({ columns: [t.membershipOrderId,t.userId], foreignColumns: [workspaceMembershipOrders.id,workspaceMembershipOrders.userId] }).onDelete('restrict'),
  check('workspace_refund_request_check', sql`${t.requestedAt} = ${t.createdAt} AND ${t.requestedAt} <= ${t.eligibilityDeadline} AND ${t.amountPaise} > 0 AND ${t.currency} = 'INR' AND ${t.payloadHash} ~ '^[a-f0-9]{64}$' AND ${t.reason} IN ('mistake','unsuitable','technical','changed_mind','other') AND (${t.note} IS NULL OR length(${t.note}) <= 2000) AND ((${t.decision} = 'requested' AND ${t.decidedBy} IS NULL AND ${t.decidedAt} IS NULL AND ${t.rejectionReason} IS NULL) OR (${t.decision} IN ('approved','rejected') AND ${t.decidedBy} IS NOT NULL AND ${t.decidedAt} >= ${t.requestedAt} AND ((${t.decision} = 'approved' AND ${t.rejectionReason} IS NULL) OR (${t.decision} = 'rejected' AND length(trim(${t.rejectionReason})) BETWEEN 1 AND 2000 AND ${t.rejectionReason} IS NOT NULL))))`),
  index('workspace_refund_queue_idx').on(t.decision,t.requestedAt),
]);
export const workspaceRefundAttempts = pgTable('workspace_refund_attempts', {
  id: uuid('id').defaultRandom().primaryKey(), requestId: uuid('request_id').notNull(), membershipOrderId: uuid('membership_order_id').notNull(), userId: uuid('user_id').notNull(),
  providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').notNull(), providerPaymentId: text('provider_payment_id').notNull(), amountPaise: integer('amount_paise').notNull(), currency: text('currency').notNull(),
  state: text('state').$type<import('@/lib/workspace/refunds/model').RefundExecution>().default('prepared').notNull(), providerRefundId: text('provider_refund_id'), startedAt: timestamp('started_at', { withTimezone: true }), lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }), evidenceHash: text('evidence_hash'), errorCode: text('error_code'), createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
},t=>[unique('workspace_refund_attempt_request_unique').on(t.requestId), unique('workspace_refund_attempt_order_unique').on(t.membershipOrderId), unique('workspace_refund_attempt_snapshot_unique').on(t.id,t.membershipOrderId,t.userId), uniqueIndex('workspace_refund_provider_id_idx').on(t.providerAccountId,t.providerMode,t.providerRefundId),
 foreignKey({columns:[t.requestId,t.membershipOrderId,t.userId],foreignColumns:[workspaceRefundRequests.id,workspaceRefundRequests.membershipOrderId,workspaceRefundRequests.userId]}).onDelete('restrict'),
 check('workspace_refund_attempt_check',sql`${t.amountPaise} > 0 AND ${t.currency} = 'INR' AND ${t.providerMode} IN ('test','live') AND ${t.providerPaymentId} ~ '^pay_[A-Za-z0-9]{6,80}$' AND ${t.state} IN ('prepared','processing','completed','failed','uncertain') AND (${t.providerRefundId} IS NULL OR ${t.providerRefundId} ~ '^rfnd_[A-Za-z0-9]{6,80}$') AND (${t.evidenceHash} IS NULL OR ${t.evidenceHash} ~ '^[a-f0-9]{64}$') AND (${t.state} <> 'completed' OR (${t.providerRefundId} IS NOT NULL AND ${t.evidenceHash} IS NOT NULL))`),
]);
export const workspaceRefundCompletions = pgTable('workspace_refund_completions', {
 id: uuid('id').defaultRandom().primaryKey(), membershipOrderId: uuid('membership_order_id').notNull(), userId: uuid('user_id').notNull(), providerAccountId: text('provider_account_id').notNull(), providerMode: text('provider_mode').notNull(), providerPaymentId: text('provider_payment_id').notNull(), providerRefundId: text('provider_refund_id').notNull(), amountPaise: integer('amount_paise').notNull(), currency: text('currency').notNull(), evidenceHash: text('evidence_hash').notNull(), confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(), evidence: jsonb('evidence').$type<{ rule: 'razorpay_full_refund_fetch_v1'; payment: import('@/lib/workspace/payments/model').ProviderPayment; refund: import('@/lib/workspace/refunds/model').ProviderRefund }>().notNull(),
},t=>[unique('workspace_refund_completion_order_unique').on(t.membershipOrderId),unique('workspace_refund_completion_provider_unique').on(t.providerAccountId,t.providerMode,t.providerRefundId),foreignKey({columns:[t.membershipOrderId,t.userId],foreignColumns:[workspaceMembershipOrders.id,workspaceMembershipOrders.userId]}).onDelete('restrict'),check('workspace_refund_completion_check',sql`${t.amountPaise} > 0 AND ${t.currency} = 'INR' AND ${t.providerMode} IN ('test','live') AND ${t.providerRefundId} ~ '^rfnd_[A-Za-z0-9]{6,80}$' AND ${t.providerPaymentId} ~ '^pay_[A-Za-z0-9]{6,80}$' AND ${t.evidenceHash} ~ '^[a-f0-9]{64}$'`)]);
export const workspaceRefundNotices = pgTable('workspace_refund_notices', {
 id: uuid('id').defaultRandom().primaryKey(), membershipOrderId: uuid('membership_order_id').notNull().references(()=>workspaceMembershipOrders.id,{onDelete:'restrict'}), kind:text('kind').$type<'received'|'rejected'|'initiated'|'completed'>().notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('workspace_refund_notice_unique').on(t.membershipOrderId,t.kind),check('workspace_refund_notice_kind_check',sql`${t.kind} IN ('received','rejected','initiated','completed')`)]);
export const workspaceRefundObservations = pgTable('workspace_refund_observations', {
 id:uuid('id').defaultRandom().primaryKey(),membershipOrderId:uuid('membership_order_id').notNull().references(()=>workspaceMembershipOrders.id,{onDelete:'restrict'}),evidenceHash:text('evidence_hash').notNull(),outcome:text('outcome').$type<'none'|'processing'|'partial_review'|'full'|'mismatch_review'>().notNull(),observedAt:timestamp('observed_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('workspace_refund_observation_unique').on(t.membershipOrderId,t.evidenceHash),check('workspace_refund_observation_check',sql`${t.evidenceHash} ~ '^[a-f0-9]{64}$' AND ${t.outcome} IN ('none','processing','partial_review','full','mismatch_review')`)]);

// Downstream delivery state is separate from immutable refund business notice facts.
export const workspaceRefundNoticeDeliveries = pgTable('workspace_refund_notice_deliveries', {
 id:uuid('id').defaultRandom().primaryKey(), noticeId:uuid('notice_id').notNull().references(()=>workspaceRefundNotices.id,{onDelete:'restrict'}),
 state:text('state').$type<import('@/lib/workspace/refund-notifications/model').DeliveryState>().default('pending').notNull(), currentAttemptId:uuid('current_attempt_id'), leaseUntil:timestamp('lease_until',{withTimezone:true}), attemptCount:integer('attempt_count').default(0).notNull(), nextAttemptAt:timestamp('next_attempt_at',{withTimezone:true}), reasonCode:text('reason_code'), payloadHash:text('payload_hash'), recipientHash:text('recipient_hash'), providerConfigHash:text('provider_config_hash'), templateVersion:text('template_version'), acceptedAt:timestamp('accepted_at',{withTimezone:true}), createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(), updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(), version:integer('version').default(1).notNull(),
},t=>[unique('workspace_refund_delivery_notice_unique').on(t.noticeId),index('workspace_refund_delivery_queue_idx').on(t.state,t.nextAttemptAt,t.leaseUntil),
 check('workspace_refund_delivery_state_check',sql`${t.state} IN ('pending','claimed','submitted','accepted','retryable_failure','uncertain','blocked') AND ${t.attemptCount} BETWEEN 0 AND 5 AND ${t.version}>0 AND ((${t.state} IN ('claimed','submitted') AND ${t.currentAttemptId} IS NOT NULL AND ${t.leaseUntil} IS NOT NULL) OR (${t.state} NOT IN ('claimed','submitted') AND ${t.leaseUntil} IS NULL)) AND ((${t.state}='accepted' AND ${t.acceptedAt} IS NOT NULL) OR (${t.state}<>'accepted' AND ${t.acceptedAt} IS NULL)) AND (${t.reasonCode} IS NULL OR ${t.reasonCode} ~ '^[a-z_]{1,80}$') AND ((${t.payloadHash} IS NULL AND ${t.recipientHash} IS NULL AND ${t.providerConfigHash} IS NULL AND ${t.templateVersion} IS NULL) OR (${t.payloadHash} ~ '^[a-f0-9]{64}$' AND ${t.recipientHash} ~ '^[a-f0-9]{64}$' AND ${t.providerConfigHash} ~ '^[a-f0-9]{64}$' AND ${t.templateVersion}='workspace-refund-notice-v1'))`),
]);
export const workspaceRefundNoticeDeliveryAttempts = pgTable('workspace_refund_notice_delivery_attempts', {
 id:uuid('id').primaryKey(),deliveryId:uuid('delivery_id').notNull().references(()=>workspaceRefundNoticeDeliveries.id,{onDelete:'restrict'}),attemptNumber:integer('attempt_number').notNull(), state:text('state').$type<import('@/lib/workspace/refund-notifications/model').AttemptState>().default('claimed').notNull(),channel:text('channel').default('mailercloud-email-api-v1').notNull(),dispatchAt:timestamp('dispatch_at',{withTimezone:true}),finishedAt:timestamp('finished_at',{withTimezone:true}),reasonCode:text('reason_code'),providerCode:integer('provider_code'),providerReference:text('provider_reference'),payloadHash:text('payload_hash'),recipientHash:text('recipient_hash'),providerConfigHash:text('provider_config_hash'),templateVersion:text('template_version'),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('workspace_refund_delivery_attempt_number_unique').on(t.deliveryId,t.attemptNumber),
 check('workspace_refund_delivery_attempt_check',sql`${t.attemptNumber} BETWEEN 1 AND 5 AND ${t.channel}='mailercloud-email-api-v1' AND ${t.state} IN ('claimed','submitted','accepted','retryable_failure','uncertain','blocked') AND ((${t.state} IN ('claimed','submitted') AND ${t.finishedAt} IS NULL AND ${t.reasonCode} IS NULL) OR (${t.state} NOT IN ('claimed','submitted') AND ${t.finishedAt}>=${t.createdAt} AND ${t.reasonCode} IS NOT NULL)) AND (${t.state}<>'claimed' OR ${t.dispatchAt} IS NULL) AND (${t.dispatchAt} IS NULL OR ${t.dispatchAt}>=${t.createdAt}) AND (${t.state} NOT IN ('submitted','accepted','uncertain') OR ${t.dispatchAt} IS NOT NULL) AND (${t.providerCode} IS NULL OR ${t.providerCode} BETWEEN 1 AND 9999) AND (${t.providerReference} IS NULL OR ${t.providerReference} ~ '^[A-Za-z0-9_-]{1,100}$') AND (${t.reasonCode} IS NULL OR ${t.reasonCode} ~ '^[a-z_]{1,80}$') AND ((${t.payloadHash} IS NULL AND ${t.recipientHash} IS NULL AND ${t.providerConfigHash} IS NULL AND ${t.templateVersion} IS NULL) OR (${t.payloadHash} ~ '^[a-f0-9]{64}$' AND ${t.recipientHash} ~ '^[a-f0-9]{64}$' AND ${t.providerConfigHash} ~ '^[a-f0-9]{64}$' AND ${t.templateVersion}='workspace-refund-notice-v1'))`),
]);

// Workspace ownership proof is separate from mutable LMS contact data; no backfill.
export const workspaceEmailChallenges = pgTable('workspace_email_challenges', {
 id:uuid('id').primaryKey(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),email:text('email').notNull(),codeHash:text('code_hash').notNull(),state:text('state').notNull(),attempts:integer('attempts').default(0).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),acceptedAt:timestamp('accepted_at',{withTimezone:true}),consumedAt:timestamp('consumed_at',{withTimezone:true}),
},t=>[index('workspace_email_challenge_user_created_idx').on(t.userId,t.createdAt),uniqueIndex('workspace_email_one_open_idx').on(t.userId).where(sql`${t.state} IN ('sending','accepted','uncertain')`),check('workspace_email_challenge_check',sql`${t.email}=lower(btrim(${t.email})) AND length(${t.email}) BETWEEN 3 AND 254 AND ${t.email} !~ '[[:space:]]' AND ${t.codeHash} ~ '^[a-f0-9]{64}$' AND ${t.attempts} BETWEEN 0 AND 5 AND ${t.expiresAt}=${t.createdAt}+interval '10 minutes' AND ${t.state} IN ('sending','accepted','uncertain','failed','superseded','expired','exhausted','consumed') AND (${t.state}<>'consumed' OR (${t.consumedAt} IS NOT NULL AND ${t.consumedAt} BETWEEN ${t.createdAt} AND ${t.expiresAt} AND ${t.acceptedAt} IS NOT NULL AND ${t.attempts}<5)) AND (${t.state}='consumed' OR ${t.consumedAt} IS NULL)`)]);
export const workspaceVerifiedEmails = pgTable('workspace_verified_emails', {
 id:uuid('id').primaryKey(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),email:text('email').notNull(),challengeId:uuid('challenge_id').notNull().references(()=>workspaceEmailChallenges.id,{onDelete:'restrict'}),verifiedAt:timestamp('verified_at',{withTimezone:true}).notNull(),active:boolean('active').default(true).notNull(),revokedAt:timestamp('revoked_at',{withTimezone:true}),
},t=>[unique('workspace_verified_email_challenge_unique').on(t.challengeId),uniqueIndex('workspace_verified_email_user_idx').on(t.userId).where(sql`${t.active}`),uniqueIndex('workspace_verified_email_address_idx').on(t.email).where(sql`${t.active}`),check('workspace_verified_email_check',sql`${t.email}=lower(btrim(${t.email})) AND length(${t.email}) BETWEEN 3 AND 254 AND ((${t.active} AND ${t.revokedAt} IS NULL) OR (NOT ${t.active} AND ${t.revokedAt} IS NOT NULL AND ${t.revokedAt}>=${t.verifiedAt}))`)]);
export const workspaceEmailRateLimits = pgTable('workspace_email_rate_limits', {key:text('key').notNull(),windowAt:timestamp('window_at',{withTimezone:true}).notNull(),count:integer('count').notNull()},t=>[primaryKey({columns:[t.key,t.windowAt]}),check('workspace_email_rate_check',sql`${t.key} ~ '^[a-f0-9]{64}$' AND ${t.count}>0`)]);
export const workspaceEmailNoticeBindings = pgTable('workspace_email_notice_bindings', {noticeId:uuid('notice_id').primaryKey().references(()=>workspaceRefundNotices.id,{onDelete:'restrict'}),verificationId:uuid('verification_id').references(()=>workspaceVerifiedEmails.id,{onDelete:'restrict'}),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull()});

// Complimentary authorization evidence is separate from paid membership/financial ledgers.
export const workspaceAccessGrants = pgTable('workspace_access_grants', {
  id: uuid('id').defaultRandom().primaryKey(), userId: uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}), creatorProfileId: uuid('creator_profile_id').notNull(),
  eligibilityAttemptId: uuid('eligibility_attempt_id').notNull().references(()=>workspaceEligibilityAttempts.id,{onDelete:'restrict'}),
  source: text('source').default('admin_complimentary').notNull(), scope: text('scope').default('creator_workspace').notNull(), environment: text('environment').$type<'development'|'test'|'production'>().notNull(),
  status: text('status').$type<'active'|'revoked'|'expired'>().default('active').notNull(), startsAt: timestamp('starts_at',{withTimezone:true}).notNull(), expiresAt: timestamp('expires_at',{withTimezone:true}).notNull(),
  reason: text('reason').notNull(), grantedBy: uuid('granted_by').notNull().references(()=>users.id,{onDelete:'restrict'}), requestKey: uuid('request_key').notNull(), payloadHash: text('payload_hash').notNull(),
  termsVersion: text('terms_version').notNull(), termsContentHash: text('terms_content_hash').notNull(), createdAt: timestamp('created_at',{withTimezone:true}).notNull(),
  closedAt: timestamp('closed_at',{withTimezone:true}), closedBy: uuid('closed_by').references(()=>users.id,{onDelete:'restrict'}), closeReason: text('close_reason'),
},t=>[
  uniqueIndex('workspace_grant_actor_key_idx').on(t.grantedBy,t.requestKey),uniqueIndex('workspace_grant_owner_idx').on(t.id,t.userId),
  uniqueIndex('workspace_grant_open_owner_idx').on(t.userId,t.environment).where(sql`${t.status}='active'`),index('workspace_grant_owner_expiry_idx').on(t.userId,t.environment,t.expiresAt),index('workspace_grant_created_idx').on(t.createdAt,t.id),
  foreignKey({columns:[t.creatorProfileId,t.userId],foreignColumns:[workspaceCreatorProfiles.id,workspaceCreatorProfiles.userId],name:'workspace_grant_profile_owner_fk'}).onDelete('restrict'),
  foreignKey({columns:[t.termsVersion,t.termsContentHash],foreignColumns:[workspaceCreatorTermsVersions.termsVersion,workspaceCreatorTermsVersions.contentHash],name:'workspace_grant_terms_fk'}).onDelete('restrict'),
  check('workspace_grant_context_check',sql`${t.source}='admin_complimentary' AND ${t.scope}='creator_workspace' AND ${t.environment} IN ('development','test','production') AND ${t.payloadHash} ~ '^[a-f0-9]{64}$' AND length(btrim(${t.reason})) BETWEEN 10 AND 1000`),
  check('workspace_grant_term_check',sql`${t.startsAt}>=${t.createdAt} AND ${t.startsAt}<=${t.createdAt}+interval '30 days' AND ${t.expiresAt}>${t.startsAt} AND ${t.expiresAt}<=(((${t.startsAt} AT TIME ZONE 'Asia/Kolkata')+interval '12 months') AT TIME ZONE 'Asia/Kolkata')`),
  check('workspace_grant_status_check',sql`(${t.status}='active' AND ${t.closedAt} IS NULL AND ${t.closedBy} IS NULL AND ${t.closeReason} IS NULL) OR (${t.status} IN ('revoked','expired') AND ${t.closedAt} IS NOT NULL AND ${t.closedAt}>=${t.createdAt} AND ${t.closedBy} IS NOT NULL AND length(btrim(${t.closeReason})) BETWEEN 10 AND 1000 AND (${t.status}<>'expired' OR ${t.closedAt}>=${t.expiresAt}))`),
]);
export const workspaceAccessGrantEvents = pgTable('workspace_access_grant_events',{
  id: uuid('id').defaultRandom().primaryKey(),grantId: uuid('grant_id').notNull(),userId:uuid('user_id').notNull(),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
  action:text('action').$type<'granted'|'revoked'|'expired'>().notNull(),reason:text('reason').notNull(),requestKey:uuid('request_key').notNull(),payloadHash:text('payload_hash').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
},t=>[uniqueIndex('workspace_grant_event_actor_key_idx').on(t.actorId,t.requestKey),uniqueIndex('workspace_grant_event_action_idx').on(t.grantId,t.action),index('workspace_grant_event_created_idx').on(t.createdAt,t.id),
  foreignKey({columns:[t.grantId,t.userId],foreignColumns:[workspaceAccessGrants.id,workspaceAccessGrants.userId],name:'workspace_grant_event_owner_fk'}).onDelete('restrict'),
  check('workspace_grant_event_context_check',sql`${t.action} IN ('granted','revoked','expired') AND length(btrim(${t.reason})) BETWEEN 10 AND 1000 AND ${t.payloadHash} ~ '^[a-f0-9]{64}$'`)]);

// Durable private processing outbox. Never an LMS video/job identity.
export const workspaceMediaJobs = pgTable('workspace_media_jobs', {
  id: uuid('id').primaryKey(),
  assetId: uuid('asset_id').notNull().references(() => workspaceCourseAssets.id, { onDelete: 'restrict' }).unique(),
  state: text('state').$type<'queued' | 'dispatching' | 'submitted' | 'complete' | 'failed' | 'uncertain'>().notNull(),
  sourceVersion: text('source_version').notNull(),
  policy: text('policy').notNull(),
  providerJobId: text('provider_job_id'),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  manifest: jsonb('manifest').$type<Record<string, { version: string; checksum: string; size: number }>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
}, t => [
  check('workspace_media_jobs_state_check', sql`${t.state} IN ('queued','dispatching','submitted','complete','failed','uncertain') AND length(${t.sourceVersion})>0 AND ${t.sourceVersion}<>'null' AND length(${t.policy})>0 AND ${t.updatedAt}>=${t.createdAt} AND (${t.state}<>'complete' OR (${t.manifest} IS NOT NULL AND ${t.providerJobId} IS NOT NULL))`),
  index('workspace_media_jobs_pending_idx').on(t.state, t.updatedAt),
]);

// Creator publishing is an adapter into the existing LMS, not a parallel LMS.
export const workspaceTrustedCreators=pgTable('workspace_trusted_creators',{
 creatorProfileId:uuid('creator_profile_id').primaryKey().references(()=>workspaceCreatorProfiles.id,{onDelete:'restrict'}),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),trusted:boolean('trusted').default(false).notNull(),version:integer('version').notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull(),
},t=>[foreignKey({columns:[t.creatorProfileId,t.userId],foreignColumns:[workspaceCreatorProfiles.id,workspaceCreatorProfiles.userId],name:'workspace_trust_owner_fk'}).onDelete('restrict'),check('workspace_trust_version_check',sql`${t.version}>0`)]);
export const workspacePublicationStates=pgTable('workspace_publication_states',{
 projectId:uuid('project_id').primaryKey().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),version:integer('version').default(0).notNull(),metadata:jsonb('metadata').$type<import('@/lib/workspace/publishing/model').PublicationMetadata>().notNull(),guidelines:jsonb('guidelines').$type<import('@/lib/workspace/publishing/policy').GuidelineAcceptance>(),moderation:jsonb('moderation').$type<import('@/lib/workspace/publishing/policy').Moderation>(),status:text('status').$type<'draft'|'live'|'unpublished'|'suspended'>().default('draft').notNull(),courseId:uuid('course_id').references(()=>courses.id,{onDelete:'restrict'}).unique(),currentRevisionId:uuid('current_revision_id').references(()=>workspacePublicationRevisions.id,{onDelete:'restrict'}),currentPriceId:uuid('current_price_id').references(()=>workspacePublicationPrices.id,{onDelete:'restrict'}),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull(),
},t=>[index('workspace_publication_moderation_idx').on(t.updatedAt,t.projectId).where(sql`${t.moderation}->>'restriction'<>'none'`),foreignKey({columns:[t.projectId,t.userId],foreignColumns:[workspaceCourseProjects.id,workspaceCourseProjects.userId],name:'workspace_publication_owner_fk'}).onDelete('restrict'),check('workspace_publication_state_check',sql`${t.version}>=0 AND ${t.status} IN ('draft','live','unpublished','suspended') AND (${t.status}<>'live' OR (${t.courseId} IS NOT NULL AND ${t.currentRevisionId} IS NOT NULL AND ${t.currentPriceId} IS NOT NULL))`)]);
export const workspacePublicationRevisions=pgTable('workspace_publication_revisions',{
 id:uuid('id').defaultRandom().primaryKey(),projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),number:integer('number').notNull(),snapshot:jsonb('snapshot').$type<import('@/lib/workspace/publishing/model').FrozenCourse>().notNull(),contentHash:text('content_hash').notNull(),status:text('status').$type<'submitted'|'under_review'|'changes_requested'|'approved'|'creator'>().default('submitted').notNull(),feedback:text('feedback').default('').notNull(),decidedBy:uuid('decided_by').references(()=>users.id,{onDelete:'restrict'}),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull(),
},t=>[unique('workspace_publication_revision_number').on(t.projectId,t.number),foreignKey({columns:[t.projectId,t.userId],foreignColumns:[workspaceCourseProjects.id,workspaceCourseProjects.userId],name:'workspace_revision_owner_fk'}).onDelete('restrict'),check('workspace_publication_revision_check',sql`${t.number}>0 AND ${t.contentHash} ~ '^[a-f0-9]{64}$' AND ${t.status} IN ('submitted','under_review','changes_requested','approved','creator') AND (${t.decidedBy} IS NULL OR ${t.decidedBy}<>${t.userId}) AND (${t.status} NOT IN ('approved','changes_requested') OR ${t.decidedBy} IS NOT NULL)`)]);
export const workspacePublicationPrices=pgTable('workspace_publication_prices',{
 id:uuid('id').defaultRandom().primaryKey(),projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),number:integer('number').notNull(),amountPaise:integer('amount_paise').notNull(),currency:text('currency').default('INR').notNull(),status:text('status').$type<'proposed'|'approved'|'rejected'|'creator'>().default('proposed').notNull(),decidedBy:uuid('decided_by').references(()=>users.id,{onDelete:'restrict'}),note:text('note').default('').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),decidedAt:timestamp('decided_at',{withTimezone:true}),
},t=>[unique('workspace_publication_price_number').on(t.projectId,t.number),foreignKey({columns:[t.projectId,t.userId],foreignColumns:[workspaceCourseProjects.id,workspaceCourseProjects.userId],name:'workspace_price_owner_fk'}).onDelete('restrict'),check('workspace_publication_price_check',sql`${t.number}>0 AND ${t.amountPaise} BETWEEN 1 AND 100000000 AND ${t.currency}='INR' AND ${t.status} IN ('proposed','approved','rejected','creator') AND (${t.decidedBy} IS NULL OR ${t.decidedBy}<>${t.userId}) AND ((${t.status} IN ('proposed','creator') AND ${t.decidedBy} IS NULL AND ${t.decidedAt} IS NULL) OR (${t.status} IN ('approved','rejected') AND ${t.decidedBy} IS NOT NULL AND ${t.decidedAt} IS NOT NULL))`)]);
export const workspacePublicationModules=pgTable('workspace_publication_modules',{
 projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),sourceId:uuid('source_id').notNull(),lmsId:uuid('lms_id').notNull().references(()=>modules.id,{onDelete:'restrict'}).unique(),
},t=>[primaryKey({columns:[t.projectId,t.sourceId]})]);
export const workspacePublicationLessons=pgTable('workspace_publication_lessons',{
 projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),sourceId:uuid('source_id').notNull(),lmsId:uuid('lms_id').notNull().references(()=>lessons.id,{onDelete:'restrict'}).unique(),
},t=>[primaryKey({columns:[t.projectId,t.sourceId]})]);
export const workspacePublicationReleases=pgTable('workspace_publication_releases',{
 id:uuid('id').defaultRandom().primaryKey(),projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),courseId:uuid('course_id').notNull().references(()=>courses.id,{onDelete:'restrict'}),revisionId:uuid('revision_id').notNull().references(()=>workspacePublicationRevisions.id,{onDelete:'restrict'}),priceId:uuid('price_id').notNull().references(()=>workspacePublicationPrices.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),number:integer('number').notNull(),authority:text('authority').$type<'admin_approved'|'trusted'|'creator'>().notNull(),trustVersion:integer('trust_version'),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
},t=>[unique('workspace_publication_release_number').on(t.projectId,t.number)]);
export const workspacePublicationEvents=pgTable('workspace_publication_events',{
 id:uuid('id').defaultRandom().primaryKey(),projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),action:text('action').notNull(),requestKey:uuid('request_key').notNull(),commandHash:text('command_hash').notNull(),note:text('note').default('').notNull(),result:jsonb('result').$type<Record<string,unknown>>().notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
},t=>[unique('workspace_publication_event_request').on(t.actorId,t.requestKey),index('workspace_publication_event_project').on(t.projectId,t.createdAt)]);
export const workspaceTrustEvents=pgTable('workspace_trust_events',{
 id:uuid('id').defaultRandom().primaryKey(),creatorProfileId:uuid('creator_profile_id').notNull().references(()=>workspaceCreatorProfiles.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),trusted:boolean('trusted').notNull(),version:integer('version').notNull(),reason:text('reason').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
},t=>[unique('workspace_trust_event_version').on(t.creatorProfileId,t.version)]);

// Shared learner feedback. Creator publication approval remains a separate domain.
export const courseReviews = pgTable('course_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  rating: integer('rating').notNull(), content: text('content').notNull(),
  showName: boolean('show_name').default(false).notNull(),
  status: text('status').$type<'pending' | 'published' | 'hidden' | 'deleted'>().default('pending').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [unique('course_review_learner_unique').on(t.courseId, t.userId),
  index('course_review_public_idx').on(t.courseId, t.status, t.updatedAt, t.id),
  check('course_review_valid', sql`${t.rating} BETWEEN 1 AND 5 AND length(${t.content}) BETWEEN 20 AND 3000 AND ${t.version}>0 AND ${t.status} IN ('pending','published','hidden','deleted')`)]);
export const courseReviewReports = pgTable('course_review_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id').notNull().references(() => courseReviews.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [unique('course_review_report_unique').on(t.reviewId, t.userId), check('course_review_report_reason', sql`length(${t.reason}) BETWEEN 10 AND 1000`)]);
export const courseReviewEvents = pgTable('course_review_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  reviewId: uuid('review_id').notNull().references(() => courseReviews.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  action: text('action').notNull(), reason: text('reason').default('').notNull(),
  version: integer('version').notNull(),
  snapshot: jsonb('snapshot').$type<{rating:number;content:string;showName:boolean;status:string}>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [unique('course_review_event_version').on(t.reviewId, t.version), index('course_review_actor_time_idx').on(t.actorId,t.createdAt)]);
export const courseDiscoveryStats = pgTable('course_discovery_stats', {
  courseId: uuid('course_id').primaryKey().references(() => courses.id, { onDelete: 'cascade' }),
  reviewCount: integer('review_count').default(0).notNull(), ratingSum: integer('rating_sum').default(0).notNull(),
  distribution: jsonb('distribution').$type<number[]>().default([0,0,0,0,0]).notNull(),
  learners: integer('learners').default(0).notNull(), engaged: integer('engaged').default(0).notNull(), completed: integer('completed').default(0).notNull(),
  lessons: integer('lessons').default(0).notNull(), modules: integer('modules').default(0).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const workspacePublicationNotices=pgTable('workspace_publication_notices',{
 id:uuid('id').defaultRandom().primaryKey(),projectId:uuid('project_id').notNull().references(()=>workspaceCourseProjects.id,{onDelete:'restrict'}),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),eventId:uuid('event_id').notNull().references(()=>workspacePublicationEvents.id,{onDelete:'restrict'}).unique(),message:text('message').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull(),
},t=>[index('workspace_notice_owner_idx').on(t.userId,t.createdAt),foreignKey({columns:[t.projectId,t.userId],foreignColumns:[workspaceCourseProjects.id,workspaceCourseProjects.userId],name:'workspace_notice_owner_fk'}).onDelete('restrict')]);

// Phase 2.2: course money evidence is separate from membership billing.
export const coursePaymentChecks=pgTable('course_payment_checks',{
 orderId:uuid('order_id').primaryKey().references(()=>orders.id,{onDelete:'restrict'}),scope:text('scope').notNull(),paymentId:text('payment_id').unique(),lastCheckedAt:timestamp('last_checked_at',{withTimezone:true}),nextCheckAt:timestamp('next_check_at',{withTimezone:true}).defaultNow().notNull(),issue:text('issue'),
},t=>[index('course_checks_operations_idx').on(t.scope,t.issue,t.lastCheckedAt)]);
export const creatorLedger=pgTable('creator_ledger',{
 id:uuid('id').defaultRandom().primaryKey(),creatorId:uuid('creator_id').notNull().references(()=>users.id,{onDelete:'restrict'}),orderId:uuid('order_id').notNull().references(()=>orders.id,{onDelete:'restrict'}),scope:text('scope').notNull(),sourceKey:text('source_key').notNull(),kind:text('kind').notNull(),grossPaise:integer('gross_paise').default(0).notNull(),taxPaise:integer('tax_paise').default(0).notNull(),feePaise:integer('fee_paise').default(0).notNull(),feeTaxPaise:integer('fee_tax_paise').default(0).notNull(),netPaise:integer('net_paise').notNull(),commissionPaise:integer('commission_paise').default(0).notNull(),evidence:jsonb('evidence').$type<Record<string,unknown>>().notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('creator_ledger_source').on(t.orderId,t.sourceKey),index('creator_ledger_owner').on(t.creatorId,t.createdAt),check('creator_ledger_money',sql`${t.commissionPaise}=0 AND ${t.netPaise}=${t.grossPaise}-${t.taxPaise}-${t.feePaise}`)]);
export const coursePaymentInbox=pgTable('course_payment_inbox',{
 id:text('id').primaryKey(),scope:text('scope').notNull(),hash:text('hash').notNull(),paymentId:text('payment_id').notNull(),disputeId:text('dispute_id'),state:text('state').default('pending').notNull(),attempts:integer('attempts').default(0).notNull(),nextAttemptAt:timestamp('next_attempt_at',{withTimezone:true}).defaultNow().notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),error:text('error'),
},t=>[index('course_inbox_due').on(t.state,t.nextAttemptAt),index('course_inbox_operations_idx').on(t.scope,t.createdAt).where(sql`${t.state}<>'done' OR ${t.error} IS NOT NULL`)]);
export const creatorPayees=pgTable('creator_payees',{
 id:uuid('id').defaultRandom().primaryKey(),creatorId:uuid('creator_id').notNull().references(()=>users.id,{onDelete:'restrict'}),encrypted:text('encrypted').notNull(),masked:text('masked').notNull(),policyVersion:text('policy_version').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const creatorFinanceEvents=pgTable('creator_finance_events',{
 id:uuid('id').defaultRandom().primaryKey(),creatorId:uuid('creator_id').notNull().references(()=>users.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),requestKey:uuid('request_key').notNull(),commandHash:text('command_hash').notNull(),action:text('action').notNull(),entityId:uuid('entity_id').notNull(),evidence:text('evidence').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('creator_finance_request').on(t.actorId,t.requestKey),index('creator_finance_owner_time_idx').on(t.creatorId,t.createdAt,t.id)]);
export const creatorPayouts=pgTable('creator_payouts',{
 id:uuid('id').defaultRandom().primaryKey(),creatorId:uuid('creator_id').notNull().references(()=>users.id,{onDelete:'restrict'}),payeeId:uuid('payee_id').notNull().references(()=>creatorPayees.id,{onDelete:'restrict'}),scope:text('scope').notNull(),amountPaise:integer('amount_paise').notNull(),periodEnd:timestamp('period_end',{withTimezone:true}).notNull(),approvedBy:uuid('approved_by').notNull().references(()=>users.id,{onDelete:'restrict'}),state:text('state').default('approved').notNull(),bankReference:text('bank_reference'),initiatedBy:uuid('initiated_by').references(()=>users.id,{onDelete:'restrict'}),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('creator_payout_bank_reference').on(t.bankReference),index('creator_payout_owner_time_idx').on(t.creatorId,t.scope,t.createdAt,t.id),index('creator_payout_operations_idx').on(t.scope,t.state,t.updatedAt),check('creator_payout_money',sql`${t.amountPaise}>0 AND ${t.approvedBy}<>${t.creatorId} AND ${t.state} IN ('approved','initiated','uncertain','confirmed','failed','cancelled')`)]);
export const courseFinanceRuns=pgTable('course_finance_runs',{
 scope:text('scope').primaryKey(),disputeSkip:integer('dispute_skip').default(0).notNull(),disputesCheckedAt:timestamp('disputes_checked_at',{withTimezone:true}),
});

// Phase 2.2P: the existing payout reservation binds one durable provider operation.
export const creatorPayoutJobs=pgTable('creator_payout_jobs',{
 id:uuid('id').defaultRandom().primaryKey(),payoutId:uuid('payout_id').notNull().unique().references(()=>creatorPayouts.id,{onDelete:'restrict'}),scope:text('scope').notNull(),fundingFingerprint:text('funding_fingerprint').notNull(),transferMode:text('transfer_mode').notNull(),idempotencyKey:uuid('idempotency_key').defaultRandom().notNull().unique(),authorizedBy:uuid('authorized_by').references(()=>users.id,{onDelete:'restrict'}),stage:text('stage').default('awaiting_authorization').notNull(),contactId:text('contact_id'),fundAccountId:text('fund_account_id'),requestEncrypted:text('request_encrypted'),requestHash:text('request_hash'),providerId:text('provider_id').unique(),providerStatus:text('provider_status'),providerFeesPaise:integer('provider_fees_paise'),providerTaxPaise:integer('provider_tax_paise'),reason:text('reason'),utr:text('utr'),submitAttempts:integer('submit_attempts').default(0).notNull(),firstSubmittedAt:timestamp('first_submitted_at',{withTimezone:true}),attempts:integer('attempts').default(0).notNull(),nextAt:timestamp('next_at',{withTimezone:true}).defaultNow().notNull(),leaseUntil:timestamp('lease_until',{withTimezone:true}),leaseToken:uuid('lease_token'),lastError:text('last_error'),scanSkip:integer('scan_skip').default(0).notNull(),lastReconciledAt:timestamp('last_reconciled_at',{withTimezone:true}),processedAt:timestamp('processed_at',{withTimezone:true}),reversedAt:timestamp('reversed_at',{withTimezone:true}),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[index('creator_payout_job_due').on(t.stage,t.nextAt),check('creator_payout_job_stage',sql`${t.stage} in ('awaiting_authorization','ready','tracking','blocked','done') and ${t.submitAttempts}>=0 and ${t.attempts}>=0 and ${t.scanSkip}>=0`)]);
export const creatorPayoutObservations=pgTable('creator_payout_observations',{
 id:uuid('id').defaultRandom().primaryKey(),jobId:uuid('job_id').notNull().references(()=>creatorPayoutJobs.id,{onDelete:'restrict'}),providerId:text('provider_id').notNull(),source:text('source').notNull(),status:text('status').notNull(),fact:jsonb('fact').$type<Record<string,unknown>>().notNull(),hash:text('hash').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('creator_payout_observation_identity').on(t.jobId,t.source,t.hash),index('creator_payout_status_time_idx').on(t.jobId,t.source,t.status,t.createdAt,t.id),check('creator_payout_observation_source',sql`${t.source} in ('create','reconcile')`)]);
export const creatorPayoutInbox=pgTable('creator_payout_inbox',{
 id:text('id').primaryKey(),scope:text('scope').notNull(),hash:text('hash').notNull(),providerId:text('provider_id').notNull(),state:text('state').default('pending').notNull(),attempts:integer('attempts').default(0).notNull(),nextAt:timestamp('next_at',{withTimezone:true}).defaultNow().notNull(),leaseUntil:timestamp('lease_until',{withTimezone:true}),leaseToken:uuid('lease_token'),lastError:text('last_error'),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[index('creator_payout_inbox_due').on(t.state,t.nextAt)]);

// Phase 2.4: support conversations and operational evidence, reusing domain histories.
export const workspaceSupportRequests = pgTable('workspace_support_requests', {
 id:uuid('id').defaultRandom().primaryKey(),ownerId:uuid('owner_id').notNull().references(()=>users.id,{onDelete:'restrict'}),
 kind:text('kind').default('support').notNull(),category:text('category').notNull(),title:text('title').notNull(),status:text('status').default('open').notNull(),priority:text('priority').default('normal').notNull(),
 referenceKind:text('reference_kind').default('none').notNull(),referenceId:uuid('reference_id'),assigneeId:uuid('assignee_id').references(()=>users.id,{onDelete:'restrict'}),version:integer('version').default(1).notNull(),
 createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),resolvedAt:timestamp('resolved_at',{withTimezone:true}),
},t=>[index('workspace_support_owner_idx').on(t.ownerId,t.updatedAt,t.id),index('workspace_support_queue_idx').on(t.status,t.priority,t.updatedAt,t.id),index('workspace_support_created_idx').on(t.ownerId,t.createdAt),
 check('workspace_support_values',sql`${t.kind} IN ('support','course_report') AND ${t.category} IN ('account','publishing','media','access','finance','moderation','technical') AND ${t.status} IN ('open','waiting','action_needed','resolved','closed') AND ${t.priority} IN ('normal','urgent') AND length(${t.title}) BETWEEN 5 AND 160 AND ${t.version}>0 AND ${t.updatedAt}>=${t.createdAt} AND ((${t.referenceKind}='none' AND ${t.referenceId} IS NULL) OR (${t.referenceKind} IN ('course','order','payout','reported_course') AND ${t.referenceId} IS NOT NULL)) AND ((${t.status} IN ('resolved','closed'))=(${t.resolvedAt} IS NOT NULL))`),
]);
export const workspaceSupportMessages = pgTable('workspace_support_messages',{
 id:uuid('id').defaultRandom().primaryKey(),requestId:uuid('request_id').notNull().references(()=>workspaceSupportRequests.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),internal:boolean('internal').default(false).notNull(),body:text('body').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[index('workspace_support_message_idx').on(t.requestId,t.createdAt,t.id),index('workspace_support_message_actor_idx').on(t.actorId,t.createdAt),check('workspace_support_message_length',sql`length(${t.body}) BETWEEN 10 AND 4000`)]);
export const workspaceOperationEvents=pgTable('workspace_operation_events',{
 id:uuid('id').defaultRandom().primaryKey(),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),requestKey:uuid('request_key').notNull(),entityId:uuid('entity_id').notNull(),action:text('action').notNull(),commandHash:text('command_hash').notNull(),result:jsonb('result').$type<Record<string,unknown>>().notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[unique('workspace_operation_command_unique').on(t.actorId,t.requestKey),index('workspace_operation_history_idx').on(t.entityId,t.createdAt,t.id),check('workspace_operation_values',sql`${t.action} IN ('create','report','reply','note','update','media_recheck') AND ${t.commandHash} ~ '^[a-f0-9]{64}$'`)]);
export const workspaceNotificationReceipts=pgTable('workspace_notification_receipts',{
 userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'restrict'}),sourceKey:text('source_key').notNull(),readAt:timestamp('read_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[primaryKey({columns:[t.userId,t.sourceKey]}),check('workspace_notification_key',sql`${t.sourceKey} ~ '^[a-z_]+:[a-f0-9-]{36}(:[a-z_]+)?$'`)]);
export const workspaceWorkerHealth=pgTable('workspace_worker_health',{
 key:text('key').primaryKey(),token:uuid('token').notNull(),startedAt:timestamp('started_at',{withTimezone:true}).notNull(),finishedAt:timestamp('finished_at',{withTimezone:true}),succeededAt:timestamp('succeeded_at',{withTimezone:true}),leaseUntil:timestamp('lease_until',{withTimezone:true}),outcome:text('outcome').notNull(),counts:jsonb('counts').$type<Record<string,number>>().default({}).notNull(),
},t=>[check('workspace_worker_health_values',sql`${t.key} IN ('membership','course_payments','payouts','media','refund_notices') AND ${t.outcome} IN ('running','success','attention','failed') AND ((${t.outcome}='running')=(${t.leaseUntil} IS NOT NULL))`)]);

// Mentor screening is independent from Creator membership, courses and payouts.
export const mentorApplications=pgTable('mentor_applications',{
 id:uuid('id').defaultRandom().primaryKey(),ownerId:uuid('owner_id').notNull().references(()=>users.id,{onDelete:'restrict'}),submissionKey:uuid('submission_key').notNull(),payloadHash:text('payload_hash').notNull(),
 fullName:text('full_name').notNull(),email:text('email').notNull(),phone:text('phone').default('').notNull(),specialisation:text('specialisation').notNull(),professionalRole:text('professional_role').notNull(),yearsExperience:integer('years_experience').notNull(),profileUrl:text('profile_url').default('').notNull(),description:text('description').notNull(),
 adult:boolean('adult').default(true).notNull(),consent:boolean('consent').default(true).notNull(),consentVersion:text('consent_version').notNull(),consentText:text('consent_text').notNull(),adultText:text('adult_text').notNull(),status:text('status').default('submitted').notNull(),version:integer('version').default(1).notNull(),submittedAt:timestamp('submitted_at',{withTimezone:true}).defaultNow().notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex('mentor_owner_unique').on(t.ownerId),uniqueIndex('mentor_email_unique').on(t.email),uniqueIndex('mentor_submission_unique').on(t.submissionKey),index('mentor_queue_idx').on(t.status,t.specialisation,t.submittedAt,t.id),index('mentor_time_idx').on(t.submittedAt,t.id),check('mentor_application_values',sql`${t.status} IN ('submitted','under_review','shortlisted','not_selected','contacted') AND ${t.specialisation} IN ('flight_operations','cabin_crew','ground_operations','safety_quality','maintenance','training','management_other') AND ${t.yearsExperience} BETWEEN 0 AND 70 AND length(${t.fullName}) BETWEEN 2 AND 120 AND length(${t.email}) BETWEEN 3 AND 254 AND ${t.email}=lower(${t.email}) AND length(${t.phone})<=24 AND length(${t.professionalRole}) BETWEEN 2 AND 160 AND length(${t.profileUrl})<=2048 AND length(${t.description}) BETWEEN 30 AND 2000 AND ${t.adult} AND ${t.consent} AND length(${t.consentVersion}) BETWEEN 1 AND 120 AND length(${t.consentText}) BETWEEN 20 AND 1000 AND length(${t.adultText}) BETWEEN 20 AND 1000 AND ${t.payloadHash} ~ '^[a-f0-9]{64}$' AND ${t.version}>0 AND ${t.updatedAt}>=${t.submittedAt}`)]);
export const mentorReviewEvents=pgTable('mentor_review_events',{
 id:uuid('id').defaultRandom().primaryKey(),applicationId:uuid('application_id').notNull().references(()=>mentorApplications.id,{onDelete:'restrict'}),actorId:uuid('actor_id').notNull().references(()=>users.id,{onDelete:'restrict'}),requestKey:uuid('request_key').notNull(),commandHash:text('command_hash').notNull(),version:integer('version').notNull(),status:text('status').notNull(),note:text('note').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex('mentor_review_request_unique').on(t.actorId,t.requestKey),uniqueIndex('mentor_review_version_unique').on(t.applicationId,t.version),check('mentor_review_values',sql`${t.status} IN ('under_review','shortlisted','not_selected','contacted') AND ${t.version}>1 AND ${t.commandHash} ~ '^[a-f0-9]{64}$' AND length(${t.note}) BETWEEN 3 AND 2000`)]);
export const mentorSubmissionLimits=pgTable('mentor_submission_limits',{
 userId:uuid('user_id').primaryKey().references(()=>users.id,{onDelete:'restrict'}),windowStart:timestamp('window_start',{withTimezone:true}).notNull(),attempts:integer('attempts').notNull(),
},t=>[check('mentor_limit_values',sql`${t.attempts} BETWEEN 1 AND 21`)]);
