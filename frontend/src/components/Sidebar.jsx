import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartPie,
  faTableCells,
  faBuilding,
  faClipboardList,
  faBell,
  faUsers,
  faGear,
  faRightFromBracket,
  faBars,
  faXmark,
  faBookOpen,
  faUserGraduate,
  faChalkboardTeacher,
  faUsersCog,
  faSchool,
  faChartColumn
} from '@fortawesome/free-solid-svg-icons'

const navByRole = {
  ADMIN: [
    { label: 'Dashboard', icon: faChartPie, to: '/dashboard' },
    { label: 'Timetable', icon: faTableCells, to: '/timetable' },
    { label: 'Venues', icon: faBuilding, to: '/venues' },
    { label: 'Courses', icon: faBookOpen, to: '/courses' },
    { label: 'Cohorts', icon: faUsers, to: '/cohorts' },
    { label: 'Students', icon: faUserGraduate, to: '/students' },
    { label: 'Lecturers', icon: faChalkboardTeacher, to: '/lecturers' },
    { label: 'Academic setup', icon: faSchool, to: '/academic/setup' },
    { label: 'Reports', icon: faChartColumn, to: '/reports' },
    { label: 'Exams', icon: faClipboardList, to: '/exams' },
    { label: 'Notifications', icon: faBell, to: '/notifications' },
    { label: 'Users', icon: faUsersCog, to: '/admin/users' }
  ],
  LECTURER: [
    { label: 'Dashboard', icon: faChartPie, to: '/dashboard' },
    { label: 'Timetable', icon: faTableCells, to: '/timetable' },
    { label: 'Venues', icon: faBuilding, to: '/venues' },
    { label: 'Courses', icon: faBookOpen, to: '/courses' },
    { label: 'Exams', icon: faClipboardList, to: '/exams' },
    { label: 'Notifications', icon: faBell, to: '/notifications' }
  ],
  STUDENT: [
    { label: 'Dashboard', icon: faChartPie, to: '/dashboard' },
    { label: 'Timetable', icon: faTableCells, to: '/timetable' },
    { label: 'Venues', icon: faBuilding, to: '/venues' },
    { label: 'Exams', icon: faClipboardList, to: '/exams' },
    { label: 'Notifications', icon: faBell, to: '/notifications' }
  ],
  CLASS_REP: [
    { label: 'Dashboard', icon: faChartPie, to: '/dashboard' },
    { label: 'Timetable', icon: faTableCells, to: '/timetable' },
    { label: 'Venues', icon: faBuilding, to: '/venues' },
    { label: 'Cohorts', icon: faUsers, to: '/cohorts' },
    { label: 'Exams', icon: faClipboardList, to: '/exams' },
    { label: 'Notifications', icon: faBell, to: '/notifications' }
  ]
}

export default function Sidebar ({ user, onLogout }) {
  const userRoles = user?.roles || []
  const [collapsed, setCollapsed] = useState(false)

  const visibleNav = userRoles.length
    ? userRoles.flatMap(role => navByRole[role] || [])
    : navByRole.STUDENT

  const uniqueNav = Array.from(
    new Map(visibleNav.map(item => [item.to, item])).values()
  )

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className='brand-block'>
        <button
          type='button'
          className='menu-toggle'
          onClick={() => setCollapsed(value => !value)}
          aria-label='Toggle sidebar'
        >
          <FontAwesomeIcon icon={collapsed ? faBars : faXmark} />
        </button>

        {!collapsed && (
          <div className='brand-copy'>
            <p className='eyebrow'>Campus control</p>
            <h2>SeatSync</h2>
          </div>
        )}
      </div>

      <nav className='sidebar-nav' aria-label='Main navigation'>
        {uniqueNav.map(item => (
          <NavLink key={item.to} to={item.to} className='nav-item'>
            <FontAwesomeIcon icon={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        <NavLink to='/settings' className='nav-item'>
          <FontAwesomeIcon icon={faGear} />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </nav>

      <div className='sidebar-footer'>
        {!collapsed && (
          <div className='profile-pill'>
            <strong>{user?.firstName || 'User'}</strong>
            <span>{(userRoles || []).join(', ') || 'Member'}</span>
          </div>
        )}
        <button type='button' className='logout-button' onClick={onLogout}>
          <FontAwesomeIcon icon={faRightFromBracket} />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </aside>
  )
}
