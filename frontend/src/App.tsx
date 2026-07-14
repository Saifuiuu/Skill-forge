import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleGate } from './components/RoleGate'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { HomePage } from './pages/HomePage'
import { CataloguePage } from './pages/courses/CataloguePage'
import { ManageCoursesPage } from './pages/courses/ManageCoursesPage'
import { MyCoursesPage } from './pages/courses/MyCoursesPage'
import { BulkEnrolPage } from './pages/manager/BulkEnrolPage'
import { QuizPage } from './pages/quiz/QuizPage'
import {
  CertificatesPage,
  VerifyCertificatePage,
} from './pages/certificates/CertificatesPage'
import {
  CompanyCompliancePage,
  TeamCompliancePage,
} from './pages/compliance/CompliancePages'
import { LearningPathPage } from './pages/ai/LearningPathPage'
import { QuizGeneratorPage } from './pages/ai/QuizGeneratorPage'
import { SkillGapPage } from './pages/ai/SkillGapPage'
import { ComplianceAlerterPage } from './pages/ai/ComplianceAlerterPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify/:code" element={<VerifyCertificatePage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="courses" element={<CataloguePage />} />
            <Route
              path="courses/manage"
              element={
                <RoleGate roles={['CONTENT_ADMIN']}>
                  <ManageCoursesPage />
                </RoleGate>
              }
            />
            <Route path="my-courses" element={<MyCoursesPage />} />
            <Route path="learning-path" element={<LearningPathPage />} />
            <Route path="certificates" element={<CertificatesPage />} />
            <Route
              path="bulk-enrol"
              element={
                <RoleGate roles={['MANAGER']}>
                  <BulkEnrolPage />
                </RoleGate>
              }
            />
            <Route
              path="compliance/team"
              element={
                <RoleGate roles={['MANAGER']}>
                  <TeamCompliancePage />
                </RoleGate>
              }
            />
            <Route
              path="compliance/company"
              element={
                <RoleGate roles={['HR_ADMIN']}>
                  <CompanyCompliancePage />
                </RoleGate>
              }
            />
            <Route
              path="skill-gap"
              element={
                <RoleGate roles={['MANAGER', 'HR_ADMIN']}>
                  <SkillGapPage />
                </RoleGate>
              }
            />
            <Route
              path="quiz-generator"
              element={
                <RoleGate roles={['CONTENT_ADMIN']}>
                  <QuizGeneratorPage />
                </RoleGate>
              }
            />
            <Route
              path="compliance-alerter"
              element={
                <RoleGate roles={['HR_ADMIN']}>
                  <ComplianceAlerterPage />
                </RoleGate>
              }
            />
            <Route path="quiz/:courseId" element={<QuizPage />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate to="/app" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
