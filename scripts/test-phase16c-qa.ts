import assert from "node:assert";
import {
  getLessonAvailability,
  formatISTDateTime,
  formatCompactIST,
} from "../lib/lesson-availability";
import { calculateCourseProgress } from "../lib/courseProgress";

console.log("=========================================");
console.log("PHASE 16C QA SUITE — CLASSROOM CONTENT ROADMAP");
console.log("=========================================");

const now = new Date("2026-09-23T12:00:00+05:30");
const futureDate = new Date("2026-09-28T19:00:00+05:30");
const futureDate2 = new Date("2026-09-30T19:00:00+05:30");
const pastDate = new Date("2026-09-20T10:00:00+05:30");

// 1. Availability States
const immediateLesson = { id: "l1", title: "Immediate", deliveryType: "recorded", releaseAt: null };
const pastReleaseLesson = { id: "l2", title: "Past", deliveryType: "recorded", releaseAt: pastDate };
const futureReleaseLesson = { id: "l3", title: "Future Recorded", deliveryType: "recorded", releaseAt: futureDate };
const liveLesson = { id: "l4", title: "Live Q&A", deliveryType: "live", scheduledAt: futureDate2 };

const av1 = getLessonAvailability(immediateLesson, now);
assert.strictEqual(av1.state, "available");
assert.strictEqual(av1.isAccessible, true);
assert.strictEqual(av1.isLocked, false);

const av2 = getLessonAvailability(pastReleaseLesson, now);
assert.strictEqual(av2.state, "available");
assert.strictEqual(av2.isAccessible, true);
assert.strictEqual(av2.isLocked, false);

const av3 = getLessonAvailability(futureReleaseLesson, now);
assert.strictEqual(av3.state, "scheduled");
assert.strictEqual(av3.isAccessible, false);
assert.strictEqual(av3.isLocked, true);

const av4 = getLessonAvailability(liveLesson, now);
assert.strictEqual(av4.state, "live");
assert.strictEqual(av4.isAccessible, true);
assert.strictEqual(av4.isLocked, false);

console.log("✔ Test 1: Availability states verified successfully.");

// 2. Compact IST Formatters
const formattedCompact = formatCompactIST(futureDate);
assert(formattedCompact.includes("28 Sep"), `Expected '28 Sep' in ${formattedCompact}`);
assert(formattedCompact.includes("IST"), `Expected 'IST' in ${formattedCompact}`);

console.log(`✔ Test 2: Compact IST Formatter produced: "${formattedCompact}"`);

// 3. Module Upcoming Detection Logic
const mixedModule = {
  id: "m1",
  title: "Mixed Module",
  lessons: [immediateLesson, futureReleaseLesson],
};

const futureOnlyModule = {
  id: "m2",
  title: "Future Module",
  lessons: [futureReleaseLesson, { id: "l5", title: "Future 2", deliveryType: "recorded", releaseAt: futureDate2 }],
};

const completedModule = {
  id: "m3",
  title: "Completed Module",
  lessons: [immediateLesson, pastReleaseLesson],
};

const completedIds = ["l1", "l2"];

// Helper to determine module state
function analyzeModule(mod: typeof mixedModule, completed: string[]) {
  const modLessons = mod.lessons || [];
  const total = modLessons.length;
  const compCount = modLessons.filter((l) => completed.includes(l.id)).length;
  const isComplete = total > 0 && compCount === total;
  const uncompleted = modLessons.filter((l) => !completed.includes(l.id));
  const hasAvailable = uncompleted.some((l) => {
    const av = getLessonAvailability(l, now);
    return av.isAccessible && av.state !== "live";
  });
  const isUpcoming = total > 0 && !isComplete && !hasAvailable && uncompleted.length > 0;
  return { total, compCount, isComplete, isUpcoming };
}

const mod1Analysis = analyzeModule(mixedModule, []);
assert.strictEqual(mod1Analysis.isUpcoming, false, "Module with available lessons should NOT be upcoming module");

const mod2Analysis = analyzeModule(futureOnlyModule, []);
assert.strictEqual(mod2Analysis.isUpcoming, true, "Module with all future lessons SHOULD be upcoming module");

const mod3Analysis = analyzeModule(completedModule, completedIds);
assert.strictEqual(mod3Analysis.isComplete, true, "Completed module should be marked complete");
assert.strictEqual(mod3Analysis.isUpcoming, false, "Completed module should not be upcoming");

console.log("✔ Test 3: Module progression analysis correctly detects mixed, upcoming, and completed modules.");

// 4. Progress Calculation
const allModules = [mixedModule, futureOnlyModule, completedModule];
const progress = calculateCourseProgress(allModules as any, ["l1", "l2"]);
// Total lessons: 2 + 2 + 2 = 6. Completed: 2 (l1, l2). Progress = 2/6 = 33%
assert.strictEqual(progress, 33);
console.log(`✔ Test 4: Course Progress Calculation: ${progress}% for 2 of 6 lessons completed.`);

console.log("=========================================");
console.log("ALL PHASE 16C TESTS PASSED SUCCESSFULLY! 🚀");
console.log("=========================================");
