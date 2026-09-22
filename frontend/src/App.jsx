import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import TimetablePage from './pages/TimetablePage'
import VenuesPage from './pages/VenuesPage'
import ExamsPage from './pages/ExamsPage'
import NotificationsPage from './pages/NotificationsPage'
import AdminUsersPage from './pages/AdminUsersPage'
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
          <Route path='/exams' element={<ExamsPage />} />
          <Route path='/notifications' element={<NotificationsPage />} />
          <Route path='/admin/users' element={<AdminUsersPage />} />
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
      <Route
        path='/*'
        element={user ? <ProtectedLayout /> : <Navigate to='/login' replace />}
      />
    </Routes>
  )
}
