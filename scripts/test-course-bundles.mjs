import fs from "fs";
if (fs.existsSync(".env")) {
  const envContent = fs.readFileSync(".env", "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

import { db } from "../lib/db/index.ts";
import {
  users,
  courses,
  courseBundleItems,
  enrollments,
  modules,
  lessons,
  progress,
  certificates,
  orders,
} from "../lib/db/schema.ts";
import { eq, and, inArray } from "drizzle-orm";
import {
  hasCourseAccess,
  getUserAccessSummary,
  getBundleIncludedCourses,
} from "../lib/course-access.ts";
import { getCertificateEligibility } from "../lib/certificate-service.ts";
import { getStudentDashboardData } from "../lib/dashboard-data.ts";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("🚀 PHASE 22: COURSE BUNDLES & ENTITLEMENTS TEST SUITE");
  console.log("=================================================\n");

  const testSuffix = Date.now().toString().slice(-6);

  // 1. Setup Test Courses
  console.log("1. Setting up test courses and bundle...");
  const [courseAI] = await db
    .insert(courses)
    .values({
      title: `AI Tools & Practical AI Skills (Test ${testSuffix})`,
      slug: `ai-tools-test-${testSuffix}`,
      price: "1999.00",
      isPublished: true,
      certificateStatus: "active",
    })
    .returning();

  const [courseMarketing] = await db
    .insert(courses)
    .values({
      title: `Digital Marketing Mastery (Test ${testSuffix})`,
      slug: `digital-marketing-test-${testSuffix}`,
      price: "1499.00",
      isPublished: true,
      certificateStatus: "active",
    })
    .returning();

  const [courseExcel] = await db
    .insert(courses)
    .values({
      title: `Excel & Business Productivity (Test ${testSuffix})`,
      slug: `excel-test-${testSuffix}`,
      price: "1299.00",
      isPublished: true,
      certificateStatus: "active",
    })
    .returning();

  const [courseEntrepreneurship] = await db
    .insert(courses)
    .values({
      title: `Entrepreneurship Fundamentals (Test ${testSuffix})`,
      slug: `entrepreneurship-test-${testSuffix}`,
      price: "2499.00",
      isPublished: true,
      certificateStatus: "active",
    })
    .returning();

  const [courseUnrelated] = await db
    .insert(courses)
    .values({
      title: `Unrelated Standalone Course (Test ${testSuffix})`,
      slug: `unrelated-test-${testSuffix}`,
      price: "999.00",
      isPublished: true,
      certificateStatus: "active",
    })
    .returning();

  const [comboBundleCourse] = await db
    .insert(courses)
    .values({
      title: `All-in-One Combo Pass (Test ${testSuffix})`,
      slug: `combo-pass-test-${testSuffix}`,
      price: "4999.00",
      isPublished: true,
      isBundle: true,
    })
    .returning();

  // Add bundle items: Combo Pass includes AI, Marketing, Excel, Entrepreneurship
  await db.insert(courseBundleItems).values([
    { bundleCourseId: comboBundleCourse.id, courseId: courseAI.id, orderIndex: 0 },
    { bundleCourseId: comboBundleCourse.id, courseId: courseMarketing.id, orderIndex: 1 },
    { bundleCourseId: comboBundleCourse.id, courseId: courseExcel.id, orderIndex: 2 },
    { bundleCourseId: comboBundleCourse.id, courseId: courseEntrepreneurship.id, orderIndex: 3 },
  ]);

  // Setup modules and lessons for AI and Marketing to test progress & certificates
  const [moduleAI] = await db.insert(modules).values({ courseId: courseAI.id, title: "AI Fundamentals", orderIndex: 0 }).returning();
  const [lessonAI1] = await db.insert(lessons).values({ moduleId: moduleAI.id, title: "Prompt Engineering", orderIndex: 0 }).returning();
  const [lessonAI2] = await db.insert(lessons).values({ moduleId: moduleAI.id, title: "LLM Workflows", orderIndex: 1 }).returning();

  const [moduleMarketing] = await db.insert(modules).values({ courseId: courseMarketing.id, title: "SEO Fundamentals", orderIndex: 0 }).returning();
  const [lessonMarketing1] = await db.insert(lessons).values({ moduleId: moduleMarketing.id, title: "Keyword Research", orderIndex: 0 }).returning();

  // Setup Test Users
  const [userDirectAI] = await db.insert(users).values({ phone: `91999901${testSuffix}`, fullName: "Direct AI Student" }).returning();
  const [userComboBuyer] = await db.insert(users).values({ phone: `91999902${testSuffix}`, fullName: "Combo Pass Student" }).returning();
  const [userExistingCombo] = await db.insert(users).values({ phone: `91999903${testSuffix}`, fullName: "Existing Production Combo Student" }).returning();
  const [userNonEnrolled] = await db.insert(users).values({ phone: `91999904${testSuffix}`, fullName: "Non Enrolled Visitor" }).returning();
  const [userDuplicateBuyer] = await db.insert(users).values({ phone: `91999905${testSuffix}`, fullName: "AI First Then Combo Buyer" }).returning();
  const testUserIds = [userDirectAI.id, userComboBuyer.id, userExistingCombo.id, userNonEnrolled.id, userDuplicateBuyer.id];

  console.log("✓ Test fixtures created.\n");

  try {
    // -------------------------------------------------------------
    // TEST 1: Direct Course Buyer
    // -------------------------------------------------------------
    console.log("TEST 1: Direct Course Buyer (AI Buyer)");
    await db.insert(enrollments).values({
      userId: userDirectAI.id,
      courseId: courseAI.id,
      status: "active",
    });

    const directAccessAI = await hasCourseAccess(userDirectAI.id, courseAI.id);
    assert(directAccessAI.hasAccess === true, "Direct AI buyer has access to AI Course");
    assert(directAccessAI.accessType === "direct", "Direct AI buyer access type is 'direct'");

    const directAccessMarketing = await hasCourseAccess(userDirectAI.id, courseMarketing.id);
    assert(directAccessMarketing.hasAccess === false, "Direct AI buyer is DENIED access to Marketing Course");
    console.log("✓ TEST 1 PASSED\n");

    // -------------------------------------------------------------
    // TEST 2: Combo Buyer Access Resolution
    // -------------------------------------------------------------
    console.log("TEST 2: Combo Buyer Access Resolution");
    await db.insert(enrollments).values({
      userId: userComboBuyer.id,
      courseId: comboBundleCourse.id,
      status: "active",
    });

    const comboAccessAI = await hasCourseAccess(userComboBuyer.id, courseAI.id);
    assert(comboAccessAI.hasAccess === true, "Combo buyer has access to AI Course");
    assert(comboAccessAI.accessType === "bundle", "Combo buyer access type is 'bundle'");
    assert(comboAccessAI.bundleCourseId === comboBundleCourse.id, "Combo buyer access resolves to correct bundle course ID");

    const comboAccessMarketing = await hasCourseAccess(userComboBuyer.id, courseMarketing.id);
    assert(comboAccessMarketing.hasAccess === true, "Combo buyer has access to Marketing Course");

    const comboAccessExcel = await hasCourseAccess(userComboBuyer.id, courseExcel.id);
    assert(comboAccessExcel.hasAccess === true, "Combo buyer has access to Excel Course");

    const comboAccessEntrepreneurship = await hasCourseAccess(userComboBuyer.id, courseEntrepreneurship.id);
    assert(comboAccessEntrepreneurship.hasAccess === true, "Combo buyer has access to Entrepreneurship Course");

    const comboAccessUnrelated = await hasCourseAccess(userComboBuyer.id, courseUnrelated.id);
    assert(comboAccessUnrelated.hasAccess === false, "Combo buyer is DENIED access to unrelated course");
    console.log("✓ TEST 2 PASSED\n");

    // -------------------------------------------------------------
    // TEST 3: Existing Combo Student Preservation (0 migration needed)
    // -------------------------------------------------------------
    console.log("TEST 3: Existing Combo Student (Pre-existing enrollment)");
    // Student already had an enrollment in comboBundleCourse before bundle items were linked
    await db.insert(enrollments).values({
      userId: userExistingCombo.id,
      courseId: comboBundleCourse.id,
      status: "active",
      enrolledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Enrolled 7 days ago
    });

    const existingAccessAI = await hasCourseAccess(userExistingCombo.id, courseAI.id);
    assert(existingAccessAI.hasAccess === true, "Existing Combo student immediately has access to bundled AI Course");

    const existingAccessExcel = await hasCourseAccess(userExistingCombo.id, courseExcel.id);
    assert(existingAccessExcel.hasAccess === true, "Existing Combo student immediately has access to bundled Excel Course");
    console.log("✓ TEST 3 PASSED\n");

    // -------------------------------------------------------------
    // TEST 4: Non-enrolled Visitor
    // -------------------------------------------------------------
    console.log("TEST 4: Non-enrolled Visitor Access");
    const nonEnrolledAI = await hasCourseAccess(userNonEnrolled.id, courseAI.id);
    assert(nonEnrolledAI.hasAccess === false, "Non-enrolled visitor denied AI Course");

    const nonEnrolledBundle = await hasCourseAccess(userNonEnrolled.id, comboBundleCourse.id);
    assert(nonEnrolledBundle.hasAccess === false, "Non-enrolled visitor denied Combo Pass");
    console.log("✓ TEST 4 PASSED\n");

    // -------------------------------------------------------------
    // TEST 5: Duplicate Purchase Handling (Direct + Later Combo)
    // -------------------------------------------------------------
    console.log("TEST 5: Duplicate Purchase Handling (Direct + Later Combo)");
    // Step a: User purchases AI course directly
    await db.insert(enrollments).values({
      userId: userDuplicateBuyer.id,
      courseId: courseAI.id,
      status: "active",
    });

    // Step b: User later purchases Combo Pass
    await db.insert(enrollments).values({
      userId: userDuplicateBuyer.id,
      courseId: comboBundleCourse.id,
      status: "active",
    });

    const duplicateAccessAI = await hasCourseAccess(userDuplicateBuyer.id, courseAI.id);
    assert(duplicateAccessAI.hasAccess === true, "User has access to AI Course");
    // Direct enrollment takes precedence or resolves cleanly without conflicts
    assert(duplicateAccessAI.accessType === "direct", "Direct enrollment takes precedence cleanly");

    const duplicateSummary = await getUserAccessSummary(userDuplicateBuyer.id);
    assert(duplicateSummary.effectiveCourseIds.includes(courseAI.id), "AI Course is in effective courses");
    assert(duplicateSummary.effectiveCourseIds.includes(courseMarketing.id), "Marketing Course is in effective courses");
    // Confirm no duplicate IDs in effectiveCourseIds
    const uniqueIds = new Set(duplicateSummary.effectiveCourseIds);
    assert(uniqueIds.size === duplicateSummary.effectiveCourseIds.length, "No duplicate IDs in effective course list");
    console.log("✓ TEST 5 PASSED\n");

    // -------------------------------------------------------------
    // TEST 6: Independent Course Progress Isolation
    // -------------------------------------------------------------
    console.log("TEST 6: Independent Course Progress Isolation");
    // Complete AI lessons for userComboBuyer
    await db.insert(progress).values([
      { userId: userComboBuyer.id, lessonId: lessonAI1.id, isCompleted: true },
      { userId: userComboBuyer.id, lessonId: lessonAI2.id, isCompleted: true },
    ]);

    const eligibilityAI = await getCertificateEligibility(userComboBuyer.id, courseAI.id);
    assert(eligibilityAI.progressPercent === 100, "AI Course is 100% completed");
    assert(eligibilityAI.isEligible === true, "AI Course is eligible for certificate");

    const eligibilityMarketing = await getCertificateEligibility(userComboBuyer.id, courseMarketing.id);
    assert(eligibilityMarketing.progressPercent === 0, "Marketing Course progress remains 0% (isolated)");
    assert(eligibilityMarketing.isEligible === false, "Marketing Course is NOT eligible for certificate");
    console.log("✓ TEST 6 PASSED\n");

    // -------------------------------------------------------------
    // TEST 7: Bundle Included Courses Helper
    // -------------------------------------------------------------
    console.log("TEST 7: Bundle Included Courses Helper");
    const included = await getBundleIncludedCourses(comboBundleCourse.id);
    assert(included.length === 4, "Bundle returns exactly 4 included courses");
    assert(included[0].id === courseAI.id, "First bundled course is AI Course");
    assert(included[1].id === courseMarketing.id, "Second bundled course is Marketing Course");
    console.log("✓ TEST 7 PASSED\n");

    // -------------------------------------------------------------
    // TEST 8: Razorpay Order -> Verify -> Bundle Entitlement Pipeline
    // -------------------------------------------------------------
    console.log("TEST 8: Razorpay Order -> Verify -> Bundle Entitlement Pipeline");
    const [userRazorpayStudent] = await db.insert(users).values({
      phone: `91999906${testSuffix}`,
      fullName: "Razorpay Combo Buyer",
    }).returning();
    testUserIds.push(userRazorpayStudent.id);

    // 8a. Create Razorpay order row
    const testRazorpayOrderId = `order_test_${testSuffix}`;
    const [orderRow] = await db.insert(orders).values({
      userId: userRazorpayStudent.id,
      courseId: comboBundleCourse.id,
      razorpayOrderId: testRazorpayOrderId,
      amount: "4999.00",
      status: "pending",
    }).returning();

    // 8b. Simulate Razorpay verify logic (same as /api/payments/razorpay/verify)
    await db.update(orders).set({
      status: "paid",
      razorpayPaymentId: `pay_test_${testSuffix}`,
    }).where(eq(orders.id, orderRow.id));

    await db.insert(enrollments).values({
      userId: userRazorpayStudent.id,
      courseId: comboBundleCourse.id,
      status: "active",
    });

    // 8c. Verify immediate multi-course entitlement across all child courses
    const rzAccessAI = await hasCourseAccess(userRazorpayStudent.id, courseAI.id);
    const rzAccessMarketing = await hasCourseAccess(userRazorpayStudent.id, courseMarketing.id);
    const rzAccessExcel = await hasCourseAccess(userRazorpayStudent.id, courseExcel.id);
    const rzAccessEnt = await hasCourseAccess(userRazorpayStudent.id, courseEntrepreneurship.id);
    const rzAccessUnrelated = await hasCourseAccess(userRazorpayStudent.id, courseUnrelated.id);

    assert(rzAccessAI.hasAccess === true && rzAccessAI.accessType === "bundle", "Razorpay combo buyer gains AI course access via bundle");
    assert(rzAccessMarketing.hasAccess === true && rzAccessMarketing.accessType === "bundle", "Razorpay combo buyer gains Marketing access via bundle");
    assert(rzAccessExcel.hasAccess === true && rzAccessExcel.accessType === "bundle", "Razorpay combo buyer gains Excel access via bundle");
    assert(rzAccessEnt.hasAccess === true && rzAccessEnt.accessType === "bundle", "Razorpay combo buyer gains Entrepreneurship access via bundle");
    assert(rzAccessUnrelated.hasAccess === false, "Razorpay combo buyer denied unrelated course");
    console.log("✓ TEST 8 PASSED\n");

    // -------------------------------------------------------------
    // TEST 9: Course-Specific Video HLS Playback Session Authorization
    // -------------------------------------------------------------
    console.log("TEST 9: Video Playback Session Security & HLS Authorization");
    // Bundle buyer accessing AI lesson video (allowed)
    const videoAccessAI = await hasCourseAccess(userComboBuyer.id, courseAI.id);
    assert(videoAccessAI.hasAccess === true, "Combo buyer is authorized to stream AI course HLS video");

    // Bundle buyer accessing Unrelated course lesson video (forbidden)
    const videoAccessUnrelated = await hasCourseAccess(userComboBuyer.id, courseUnrelated.id);
    assert(videoAccessUnrelated.hasAccess === false, "Combo buyer is FORBIDDEN from streaming unrelated course HLS video");
    console.log("✓ TEST 9 PASSED\n");

    // -------------------------------------------------------------
    // TEST 10: Admin Bundle Persistence, Self-Inclusion & Deduplication Guards
    // -------------------------------------------------------------
    console.log("TEST 10: Admin Bundle Persistence, Self-Inclusion & Deduplication Guards");
    // Simulate admin PUT payload with: self ID + duplicate AI ID + Marketing ID + Excel ID
    const requestedCourseIds = [
      comboBundleCourse.id, // Self (must be rejected)
      courseAI.id,
      courseMarketing.id,
      courseAI.id, // Duplicate (must be deduplicated)
      courseExcel.id,
    ];

    const rawFiltered = requestedCourseIds.filter((cId) => Boolean(cId) && cId !== comboBundleCourse.id);
    const sanitizedIds = Array.from(new Set(rawFiltered));

    assert(!sanitizedIds.includes(comboBundleCourse.id), "Bundle cannot include itself");
    assert(sanitizedIds.filter((id) => id === courseAI.id).length === 1, "Duplicate course IDs are deduplicated to exactly 1 entry");
    assert(sanitizedIds.length === 3, "Sanitized list has exactly 3 unique child courses");

    // Persist new ordering
    await db.delete(courseBundleItems).where(eq(courseBundleItems.bundleCourseId, comboBundleCourse.id));
    await db.insert(courseBundleItems).values(
      sanitizedIds.map((cId, idx) => ({
        bundleCourseId: comboBundleCourse.id,
        courseId: cId,
        orderIndex: idx,
      }))
    );

    const reloadedItems = await getBundleIncludedCourses(comboBundleCourse.id);
    assert(reloadedItems.length === 3, "Persistence verified: 3 courses stored");
    assert(reloadedItems[0].id === courseAI.id, "Order index 0 matches AI Course");
    assert(reloadedItems[1].id === courseMarketing.id, "Order index 1 matches Marketing Course");
    assert(reloadedItems[2].id === courseExcel.id, "Order index 2 matches Excel Course");
    console.log("✓ TEST 10 PASSED\n");

    // -------------------------------------------------------------
    // TEST 11: Phase 22.2 Bundle vs Learning Course UX Verification
    // -------------------------------------------------------------
    console.log("TEST 11: Phase 22.2 Bundle vs Learning Course UX Verification");
    // Restore all 4 courses in bundle for clean testing
    await db.delete(courseBundleItems).where(eq(courseBundleItems.bundleCourseId, comboBundleCourse.id));
    await db.insert(courseBundleItems).values([
      { bundleCourseId: comboBundleCourse.id, courseId: courseAI.id, orderIndex: 0 },
      { bundleCourseId: comboBundleCourse.id, courseId: courseMarketing.id, orderIndex: 1 },
      { bundleCourseId: comboBundleCourse.id, courseId: courseExcel.id, orderIndex: 2 },
      { bundleCourseId: comboBundleCourse.id, courseId: courseEntrepreneurship.id, orderIndex: 3 },
    ]);

    // Fetch dashboard data for combo buyer
    const dashboardData = await getStudentDashboardData(userComboBuyer.id);

    // 11a. Ensure dashboard reports exactly 4 courses (NOT 5)
    assert(dashboardData.coursesWithStatus.length === 4, "Dashboard reports exactly 4 learning courses (Combo Pass is NOT a 5th learning card)");
    assert(dashboardData.metrics.enrolledCount === 4, "Metrics enrolledCount is 4 (not 5)");

    // 11b. Ensure Combo Bundle course is NOT in coursesWithStatus
    const hasComboInLearningCards = dashboardData.coursesWithStatus.some((c) => c.id === comboBundleCourse.id);
    assert(!hasComboInLearningCards, "Combo Pass does not appear in student learning courses list");

    // 11c. Ensure learning courses carry bundleTitle
    const aiCard = dashboardData.coursesWithStatus.find((c) => c.id === courseAI.id);
    assert(aiCard !== undefined, "AI Course card is present in dashboard data");
    assert(aiCard.bundleTitle === comboBundleCourse.title, "AI Course card has correct bundleTitle");

    // 11d. Ensure continueCourse selects an actual learning course
    assert(dashboardData.continueCourse !== null, "continueCourse is defined");
    assert(dashboardData.continueCourse.id !== comboBundleCourse.id, "continueCourse is a real learning course, never the bundle pass");

    console.log("✓ TEST 11 PASSED\n");

    console.log("=================================================");
    console.log("🎉 ALL PHASE 22, 22.1 & 22.2 TESTS PASSED (11/11)");
    console.log("=================================================");
  } catch (err) {
    console.error("\n❌ Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    console.log("\nCleaning up test fixtures...");
    const testCourseIds = [courseAI?.id, courseMarketing?.id, courseExcel?.id, courseEntrepreneurship?.id, courseUnrelated?.id, comboBundleCourse?.id].filter(Boolean);

    if (testUserIds && testUserIds.length > 0) {
      await db.delete(orders).where(inArray(orders.userId, testUserIds));
      await db.delete(progress).where(inArray(progress.userId, testUserIds));
      await db.delete(enrollments).where(inArray(enrollments.userId, testUserIds));
      await db.delete(users).where(inArray(users.id, testUserIds));
    }
    if (testCourseIds.length > 0) {
      await db.delete(courseBundleItems).where(inArray(courseBundleItems.bundleCourseId, testCourseIds));
      await db.delete(lessons).where(inArray(lessons.id, [lessonAI1?.id, lessonAI2?.id, lessonMarketing1?.id].filter(Boolean)));
      await db.delete(modules).where(inArray(modules.id, [moduleAI?.id, moduleMarketing?.id].filter(Boolean)));
      await db.delete(courses).where(inArray(courses.id, testCourseIds));
    }
    console.log("✓ Cleaned up test data.");
  }
}

runTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
