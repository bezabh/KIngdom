import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Sparkles,
  Award,
  Search,
  Layers,
  Compass,
  UserCheck,
  Play,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { Course, Lesson, Certificate, StudentEnrollment, StudentDashboardStats } from '../../types';
import {
  getAllCourses,
  getStoredEnrollments,
  enrollInCourse,
  getStoredCertificates,
  getStudentDashboardStats,
} from '../../services/educationService';
import { DashboardLayoutShell, DashboardMetricItem, DashboardTabItem } from '../DashboardLayoutShell';
import { CourseCard } from './CourseCard';
import { CoursePlayerModal } from './CoursePlayerModal';
import { AiTutorChat } from './AiTutorChat';
import { HomeworkAssistant } from './HomeworkAssistant';
import { LanguageLearningLab } from './LanguageLearningLab';
import { StudyMaterialsHub } from './StudyMaterialsHub';
import { PersonalizedPathBuilder } from './PersonalizedPathBuilder';
import { QuizExamModal } from './QuizExamModal';
import { CertificateModal } from './CertificateModal';
import { TeacherAdminDashboard } from './TeacherAdminDashboard';

interface EducationPlatformViewProps {
  onOpenPricingModal?: () => void;
  isUserSubscribed?: boolean;
  preferredLanguage?: 'en' | 'ti';
}

type EducationTab =
  | 'dashboard'
  | 'courses'
  | 'tutor'
  | 'homework'
  | 'language'
  | 'flashcards'
  | 'paths'
  | 'teacher';

export const EducationPlatformView: React.FC<EducationPlatformViewProps> = ({
  onOpenPricingModal,
  isUserSubscribed = false,
  preferredLanguage = 'ti',
}) => {
  const [activeTab, setActiveTab] = useState<EducationTab>('dashboard');

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, StudentEnrollment>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel] = useState<string>('all');
  const [filterPricing, setFilterPricing] = useState<'all' | 'free' | 'premium'>('all');

  // Modal States
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);
  const [quizModalState, setQuizModalState] = useState<{
    isOpen: boolean;
    course: Course | null;
    quizType: 'lesson_quiz' | 'final_exam';
    lesson?: Lesson;
  }>({
    isOpen: false,
    course: null,
    quizType: 'lesson_quiz',
  });
  const [activeCertificate, setActiveCertificate] = useState<Certificate | null>(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const refreshData = () => {
    const allC = getAllCourses();
    setCourses(allC);
    setEnrollments(getStoredEnrollments());
    setCertificates(getStoredCertificates());
    setStats(getStudentDashboardStats());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourseForPlayer(course);
  };

  const handleEnrollCourse = (course: Course) => {
    if (course.isPremium && !isUserSubscribed) {
      if (onOpenPricingModal) {
        onOpenPricingModal();
        return;
      }
    }
    enrollInCourse(course.id);
    refreshData();
    setSelectedCourseForPlayer(course);
  };

  const handleOpenQuiz = (quizType: 'lesson_quiz' | 'final_exam', lesson?: Lesson) => {
    if (!selectedCourseForPlayer) return;
    setQuizModalState({
      isOpen: true,
      course: selectedCourseForPlayer,
      quizType,
      lesson,
    });
  };

  const handleCertificateEarned = (cert: Certificate) => {
    setActiveCertificate(cert);
    setIsCertModalOpen(true);
    refreshData();
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleTi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesLevel = selectedLevel === 'all' || c.level === selectedLevel;
    const matchesPricing =
      filterPricing === 'all' ||
      (filterPricing === 'free' && !c.isPremium) ||
      (filterPricing === 'premium' && c.isPremium);

    return matchesSearch && matchesCategory && matchesLevel && matchesPricing;
  });

  const enrolledCourseIds = Object.keys(enrollments);
  const myEnrolledCourses = courses.filter((c) => enrolledCourseIds.includes(c.id));

  const metrics: DashboardMetricItem[] | undefined = stats
    ? [
        {
          id: 'enrolled',
          label: preferredLanguage === 'ti' ? 'ዝተመዝገብካዮም ኮርሳት' : 'Enrolled Courses',
          value: stats.totalCoursesEnrolled,
          sublabel: preferredLanguage === 'ti' ? 'ንጡፍ ትምህርቲ' : 'Active learning tracks',
          accent: 'gold',
          onClick: () => setActiveTab('dashboard'),
        },
        {
          id: 'hours',
          label: preferredLanguage === 'ti' ? 'ናይ ትምህርቲ ሰዓታት' : 'Study Hours',
          value: `${stats.totalStudyHours}h`,
          sublabel: preferredLanguage === 'ti' ? 'ጠቕላላ መጽናዕቲ' : 'Logged mastery time',
          accent: 'sky',
        },
        {
          id: 'certs',
          label: preferredLanguage === 'ti' ? 'ወግዓዊ ሰርቲፊኬታት' : 'Verified Certificates',
          value: stats.certificatesEarnedCount,
          sublabel: preferredLanguage === 'ti' ? '80%+ ፈተና ዝሓለፉ' : 'Earned credentials',
          accent: 'emerald',
          onClick: () => setActiveTab('dashboard'),
        },
        {
          id: 'catalog',
          label: preferredLanguage === 'ti' ? 'ጠቕላላ ኮርሳት' : 'Course Catalog',
          value: courses.length,
          sublabel: preferredLanguage === 'ti' ? 'STEM · ግእዝ · AI' : 'STEM · Ge’ez · AI',
          accent: 'neutral',
          onClick: () => setActiveTab('courses'),
        },
      ]
    : undefined;

  const tabs: DashboardTabItem[] = [
    {
      id: 'dashboard',
      label: preferredLanguage === 'ti' ? 'ናተይ ደሽቦርድ' : 'Student Dashboard',
      icon: GraduationCap,
    },
    {
      id: 'courses',
      label: preferredLanguage === 'ti' ? 'ዝርዝር ኮርሳት' : 'Course Catalog',
      icon: BookOpen,
      count: courses.length,
    },
    {
      id: 'tutor',
      label: preferredLanguage === 'ti' ? 'AI መምህር' : 'AI Master Tutor',
      icon: Brain,
    },
    {
      id: 'homework',
      label: preferredLanguage === 'ti' ? 'መፍቲሒ ናይ ገዛ ዕዮ' : 'Homework Solver',
      icon: HelpCircle,
    },
    {
      id: 'language',
      label: preferredLanguage === 'ti' ? 'ላቦራቶሪ ግእዝ' : "Ge'ez & Fidel Lab",
      icon: Compass,
    },
    {
      id: 'flashcards',
      label: preferredLanguage === 'ti' ? 'ካርታታትን ጽሟቕን' : 'Flashcards & Notes',
      icon: Layers,
    },
    {
      id: 'paths',
      label: preferredLanguage === 'ti' ? 'ናይ ትምህርቲ መደብ' : 'Learning Paths',
      icon: Sparkles,
    },
    {
      id: 'teacher',
      label: preferredLanguage === 'ti' ? 'ናይ መምህራን ስቱድዮ' : 'Teacher Studio',
      icon: UserCheck,
    },
  ];

  return (
    <>
      <DashboardLayoutShell
        id="education-platform-view"
        sectionLabel={preferredLanguage === 'ti' ? 'ናይ ትምህርቲ ማእከል' : 'Sovereign Academy'}
        title={
          preferredLanguage === 'ti'
            ? 'ተማሃር፡ ተለማመድ፡ ብ AI ተዓወት'
            : 'Learn, Practice & Master with AI'
        }
        subtitleTi={preferredLanguage === 'ti' ? undefined : 'ኣክሱማዊ ኣካዳሚ'}
        description={
          preferredLanguage === 'ti'
            ? 'ናይ ሒሳብን ሳይንስን ካልኩለስ፡ ጥንታዊ ቋንቋ ግእዝ፡ AI ኢንጂነሪንግ፡ ሕክምናን ዓለምለኸ ስኮላርሺፕን ብደረጃ ዝምህር ልዑላዊ መድረኽ።'
            : "Socratic AI Tutoring, STEM problem solving, Ge'ez epigraphy, full-stack AI engineering, interactive quizzes, and verified credentials."
        }
        icon={GraduationCap}
        actions={
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>{preferredLanguage === 'ti' ? 'ኮርሳት ድለ' : 'Browse Catalog'}</span>
          </button>
        }
        metrics={metrics}
        tabs={tabs}
        activeTabId={activeTab}
        onSelectTab={(id) => setActiveTab(id as EducationTab)}
      >
        {/* VIEW 1: STUDENT DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Active Courses in Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Play className="w-4 h-4 text-[#E1C47D]" />
                  <span>
                    {preferredLanguage === 'ti'
                      ? 'ዝጀመርካዮም ትምህርትታት'
                      : 'Continue Learning (In Progress)'}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('courses')}
                  className="text-xs text-[#E1C47D] hover:text-[#F3E5AB] flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>{preferredLanguage === 'ti' ? 'ኩሎም ኮርሳት ርአ' : 'Browse All Courses'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myEnrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myEnrolledCourses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      enrollment={enrollments[course.id]}
                      onSelectCourse={handleSelectCourse}
                      onEnroll={handleEnrollCourse}
                      preferredLanguage={preferredLanguage}
                      isUserSubscribed={isUserSubscribed}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#0C0D11] border border-[#8E6D28]/25 rounded-2xl p-8 text-center space-y-3">
                  <BookOpen className="w-9 h-9 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">
                    {preferredLanguage === 'ti'
                      ? 'ዝተመዝገብካሉ ኮርስ የለን'
                      : 'No Enrolled Courses Yet'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('courses')}
                    className="px-4 min-h-[40px] rounded-xl bg-[#C5A059] hover:bg-[#D5B26B] text-[#09090B] font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      {preferredLanguage === 'ti' ? 'ኮርሳት ምረጽ' : 'Explore Course Catalog'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Earned Certificates Grid */}
            <div className="space-y-4 pt-4 border-t border-[#8E6D28]/20">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>
                    {preferredLanguage === 'ti'
                      ? 'ዝተዓደልካዮም ወግዓዊ ምስክር ወረቐትታት'
                      : 'Earned Verified Credentials'}
                  </span>
                </h2>
              </div>

              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="bg-[#0C0D11] border border-[#8E6D28]/30 hover:border-[#C5A059]/60 rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#121318] border border-[#8E6D28]/35 flex items-center justify-center text-[#E1C47D] shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-slate-100 truncate">
                            {preferredLanguage === 'ti'
                              ? cert.courseTitleTi
                              : cert.courseTitleEn}
                          </h3>
                          <p className="text-xs text-slate-400 truncate tabular-nums">
                            Score: <strong className="text-[#F3E5AB]">{cert.scorePercent}%</strong> ·{' '}
                            {cert.issueDate}
                          </p>
                          <span className="text-[11px] font-mono text-slate-500 truncate block">
                            ID: {cert.certificateNumber}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCertificate(cert);
                          setIsCertModalOpen(true);
                        }}
                        className="px-4 min-h-[38px] rounded-xl bg-[#121318] hover:bg-[#C5A059] text-[#F3E5AB] hover:text-[#09090B] border border-[#8E6D28]/35 text-xs font-semibold transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                      >
                        {preferredLanguage === 'ti' ? 'ሰርቲፊኬት ርአ' : 'View Cert'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#0C0D11] border border-dashed border-[#8E6D28]/25 rounded-2xl text-center text-xs text-slate-400">
                  {preferredLanguage === 'ti'
                    ? 'ዝኾነ ኮርስ ወዲእካ 80%+ እንተኣምጺእካ ወግዓዊ ሰርቲፊኬት ኣብዚ ይወሃበካ።'
                    : 'Complete all lessons of a course and score 80%+ on the final exam to earn official credentials.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: COURSE CATALOG */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* Search & Filter Controls */}
            <div className="bg-[#0C0D11] p-4 rounded-2xl border border-[#8E6D28]/25 flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    preferredLanguage === 'ti'
                      ? 'ኮርስ ብኣርእስቲ ወይ መምህር ድለ...'
                      : 'Search courses by title, topic, or instructor...'
                  }
                  className="w-full bg-[#090A0E] border border-[#8E6D28]/25 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-[#090A0E] border border-[#8E6D28]/25 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="all">
                    {preferredLanguage === 'ti' ? 'ኩሎም ዓውድታት' : 'All Categories'}
                  </option>
                  <option value="stem">STEM & Mathematics</option>
                  <option value="geez_language">Ge&apos;ez & Semitic</option>
                  <option value="computer_science">AI & Computer Science</option>
                  <option value="medicine">Medicine & Health</option>
                  <option value="scholarships_prep">Global Scholarships</option>
                </select>

                <select
                  value={filterPricing}
                  onChange={(e) => setFilterPricing(e.target.value as 'all' | 'free' | 'premium')}
                  className="bg-[#090A0E] border border-[#8E6D28]/25 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#C5A059]"
                >
                  <option value="all">
                    {preferredLanguage === 'ti' ? 'ኩሉ ዋጋ' : 'All Access'}
                  </option>
                  <option value="free">
                    {preferredLanguage === 'ti' ? 'ነጻ ጥራይ' : 'Free Access'}
                  </option>
                  <option value="premium">
                    {preferredLanguage === 'ti' ? 'ልዑላዊ ፕሮ' : 'PRO Tier'}
                  </option>
                </select>
              </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  enrollment={enrollments[course.id]}
                  onSelectCourse={handleSelectCourse}
                  onEnroll={handleEnrollCourse}
                  preferredLanguage={preferredLanguage}
                  isUserSubscribed={isUserSubscribed}
                />
              ))}
            </div>

            {filteredCourses.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-sm">
                {preferredLanguage === 'ti'
                  ? 'ዝተረኽበ ኮርስ የለን። ፍለሻኻ ኣስተኻኽል።'
                  : 'No courses matching your filter criteria.'}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: AI SOCRATIC TUTOR */}
        {activeTab === 'tutor' && <AiTutorChat preferredLanguage={preferredLanguage} />}

        {/* VIEW 4: HOMEWORK & PROBLEM SOLVER */}
        {activeTab === 'homework' && <HomeworkAssistant preferredLanguage={preferredLanguage} />}

        {/* VIEW 5: GEEZ & FIDEL LAB */}
        {activeTab === 'language' && <LanguageLearningLab preferredLanguage={preferredLanguage} />}

        {/* VIEW 6: FLASHCARDS & STUDY MATERIALS */}
        {activeTab === 'flashcards' && <StudyMaterialsHub preferredLanguage={preferredLanguage} />}

        {/* VIEW 7: PERSONALIZED LEARNING PATHS */}
        {activeTab === 'paths' && <PersonalizedPathBuilder preferredLanguage={preferredLanguage} />}

        {/* VIEW 8: TEACHER & ADMIN STUDIO */}
        {activeTab === 'teacher' && (
          <TeacherAdminDashboard
            courses={courses}
            onCourseCreated={() => {
              refreshData();
            }}
            preferredLanguage={preferredLanguage}
          />
        )}
      </DashboardLayoutShell>

      {/* Course Player Modal */}
      {selectedCourseForPlayer && (
        <CoursePlayerModal
          course={selectedCourseForPlayer}
          enrollment={enrollments[selectedCourseForPlayer.id]}
          isOpen={!!selectedCourseForPlayer}
          onClose={() => setSelectedCourseForPlayer(null)}
          onOpenQuiz={handleOpenQuiz}
          onEnrollmentUpdated={refreshData}
          preferredLanguage={preferredLanguage}
        />
      )}

      {/* Quiz & Exam Modal */}
      {quizModalState.isOpen && quizModalState.course && (
        <QuizExamModal
          isOpen={quizModalState.isOpen}
          onClose={() => setQuizModalState((prev) => ({ ...prev, isOpen: false }))}
          course={quizModalState.course}
          quizType={quizModalState.quizType}
          lesson={quizModalState.lesson}
          onCertificateEarned={handleCertificateEarned}
          preferredLanguage={preferredLanguage}
        />
      )}

      {/* Official Certificate Modal */}
      <CertificateModal
        certificate={activeCertificate}
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        preferredLanguage={preferredLanguage}
      />
    </>
  );
};
