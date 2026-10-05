import { pgTable, pgEnum, uuid, text, numeric, boolean, integer, timestamp, uniqueIndex, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
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
