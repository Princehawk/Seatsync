import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import UnauthorizedPage from './pages/UnauthorizedPage'
import DashboardPage from './pages/DashboardPage'
import TimetablePage from './pages/TimetablePage'
import VenuesPage from './pages/VenuesPage'
import ExamsPage from './pages/ExamsPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import CoursesPage from './pages/CoursesPage'
import CohortsPage from './pages/CohortsPage'
import StudentsPage from './pages/StudentsPage'
import LecturersPage from './pages/LecturersPage'
import AcademicSetupPage from './pages/AcademicSetupPage'
import ReportsPage from './pages/ReportsPage'
import './App.css'

function ProtectedLayout () {
  const { user, logout } = useAuth()

  return (
    <div className='app-shell'>
      <Sidebar user={user} onLogout={logout} />
      <main className='main-content'>
        <Routes>
          <Route path='/dashboard' element={<DashboardPage />} />
          <Route path='/timetable' element={<TimetablePage />} />
          <Route path='/venues' element={<VenuesPage />} />
          <Route path='/courses' element={<CoursesPage />} />
          <Route path='/cohorts' element={<CohortsPage />} />
          <Route path='/students' element={<StudentsPage />} />
          <Route path='/lecturers' element={<LecturersPage />} />
          <Route path='/academic/setup' element={<AcademicSetupPage />} />
          <Route path='/reports' element={<ReportsPage />} />
          <Route path='/exams' element={<ExamsPage />} />
          <Route path='/notifications' element={<NotificationsPage />} />
          <Route
            path='/admin/users'
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </RoleProtectedRoute>
            }
          />
          <Route
            path='/settings'
            element={
              <div className='page-shell'>
                <section className='content-panel'>
                  <h1>Settings</h1>
                  <p>
                    System preferences and account controls are available here.
                  </p>
                </section>
              </div>
            }
          />
          <Route path='/unauthorized' element={<UnauthorizedPage />} />
          <Route path='*' element={<Navigate to='/dashboard' replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App () {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className='loading-screen'>Loading SeatSync...</div>
  }

  return (
    <Routes>
      <Route
        path='/login'
        element={user ? <Navigate to='/dashboard' replace /> : <LoginPage />}
      />
      <Route
        path='/register'
        element={user ? <Navigate to='/dashboard' replace /> : <RegisterPage />}
      />
      <Route path='/unauthorized' element={<UnauthorizedPage />} />
      <Route
        path='/*'
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
