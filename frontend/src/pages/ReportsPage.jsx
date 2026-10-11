import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import PaginationControls from '../components/PaginationControls'

const prettyAuditDetails = value => {
  if (!value) return 'No data recorded.'

  const normalize = raw => {
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    }
    return raw
  }

  const formatValue = raw => {
    const parsed = normalize(raw)

    if (parsed === null || parsed === undefined) return '—'
    if (typeof parsed === 'boolean') return parsed ? 'Yes' : 'No'
    if (typeof parsed === 'number' || typeof parsed === 'string')
      return String(parsed)
    if (Array.isArray(parsed)) {
      return parsed
        .map(item => {
          if (typeof item === 'object' && item !== null) {
            return Object.entries(item)
              .map(([key, entryValue]) => `${key}: ${formatValue(entryValue)}`)
              .join(', ')
          }
          return formatValue(item)
        })
        .join(' | ')
    }
    if (typeof parsed === 'object') {
      return Object.entries(parsed)
        .map(
          ([key, entryValue]) =>
            `${key.replaceAll('_', ' ')}: ${formatValue(entryValue)}`
        )
        .join(' • ')
    }
    return String(parsed)
  }

  return formatValue(value)
}

export default function ReportsPage () {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [entityType, setEntityType] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('date')
  const [direction, setDirection] = useState('desc')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [viewingLog, setViewingLog] = useState(null)

  const {
    data: result = {},
    isLoading,
    error
  } = useQuery({
    queryKey: [
      'audit-logs',
      search,
      action,
      entityType,
      dateFrom,
      dateTo,
      sort,
      direction,
      page,
      limit
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        action: action === 'all' ? '' : action,
        entityType: entityType === 'all' ? '' : entityType,
        dateFrom,
        dateTo,
        sort,
        direction,
        page: String(page),
        limit: String(limit)
      })
      return api.get(`/api/audit/logs?${params}`)
    }
  })
  const logs = Array.isArray(result.data) ? result.data : []
  const pagination = result.pagination || {}
  const updateFilter = setter => event => {
    setter(event.target.value)
    setPage(1)
  }

  return (
    <div className='page-shell'>
      <div className='page-header'>
        <div>
          <p className='eyebrow'>Administration</p>
          <h1>Audit history</h1>
          <p>
            Review academic record changes, deletions, and temporary class
            requests.
          </p>
        </div>
      </div>

      <section className='content-panel table-panel'>
        <div className='filter-row academic-list-filters audit-filter-row'>
          <input
            type='search'
            value={search}
            onChange={updateFilter(setSearch)}
            placeholder='Search action, user, record, or reason'
          />
          <select value={action} onChange={updateFilter(setAction)}>
            <option value='all'>All actions</option>
            <option value='UPDATE'>Updates</option>
            <option value='DELETE'>Deletions</option>
            <option value='ARCHIVE_COHORT'>Cohort archives</option>
            <option value='BLOCK_USER'>Block user</option>
            <option value='UNBLOCK_USER'>Unblock user</option>
            <option value='CREATE_MAKEUP_CLASS'>Make-up class requests</option>
          </select>
          <select value={entityType} onChange={updateFilter(setEntityType)}>
            <option value='all'>All record types</option>
            {[
              'unit',
              'cohort',
              'student',
              'lecturer',
              'venue',
              'exam',
              'user',
              'schedule_override'
            ].map(type => (
              <option key={type} value={type}>
                {type.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <label>
            From
            <input
              type='date'
              value={dateFrom}
              onChange={updateFilter(setDateFrom)}
            />
          </label>
          <label>
            To
            <input
              type='date'
              value={dateTo}
              onChange={updateFilter(setDateTo)}
            />
          </label>
          <select value={sort} onChange={updateFilter(setSort)}>
            <option value='date'>Sort by date</option>
            <option value='action'>Sort by action</option>
            <option value='entity'>Sort by record type</option>
            <option value='user'>Sort by user</option>
          </select>
          <button
            type='button'
            className='secondary-button'
            onClick={() => {
              setDirection(value => (value === 'asc' ? 'desc' : 'asc'))
              setPage(1)
            }}
          >
            {direction === 'desc' ? 'Newest first' : 'Oldest first'}
          </button>
        </div>

        {isLoading ? (
          <p>Loading audit history...</p>
        ) : error ? (
          <p className='form-error'>
            Unable to load audit history. Admin access is required.
          </p>
        ) : (
          <div className='academic-records-scroll'>
            <table className='audit-log-table'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Record</th>
                  <th>Record ID</th>
                  <th>Reason</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length ? (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        {log.created_at
                          ? new Date(log.created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td>
                        {[log.first_name, log.last_name]
                          .filter(Boolean)
                          .join(' ') ||
                          log.email ||
                          'System'}
                      </td>
                      <td>{String(log.action || '').replaceAll('_', ' ')}</td>
                      <td>
                        {String(log.entity_type || '').replaceAll('_', ' ')}
                      </td>
                      <td>{log.entity_id ?? '—'}</td>
                      <td>{log.reason || '—'}</td>
                      <td>
                        <button
                          type='button'
                          className='table-action'
                          onClick={() => setViewingLog(log)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='7'>No audit entries match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <PaginationControls
          page={pagination.page || page}
          pageSize={pagination.limit || limit}
          totalItems={pagination.totalItems || 0}
          totalPages={pagination.totalPages || 1}
          onPageChange={setPage}
          onPageSizeChange={size => {
            setLimit(size)
            setPage(1)
          }}
        />
      </section>
      {viewingLog && (
        <div
          className='profile-modal-backdrop'
          onClick={() => setViewingLog(null)}
        >
          <section
            className='profile-modal content-panel audit-detail-modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='audit-detail-heading'
            onClick={event => event.stopPropagation()}
          >
            <div className='page-header'>
              <div>
                <p className='eyebrow'>Audit record · #{viewingLog.id}</p>
                <h2 id='audit-detail-heading'>
                  {String(viewingLog.action || '').replaceAll('_', ' ')}
                </h2>
              </div>
              <button
                type='button'
                className='secondary-button'
                onClick={() => setViewingLog(null)}
              >
                Close
              </button>
            </div>
            <dl className='audit-detail-meta'>
              <div>
                <dt>Actor</dt>
                <dd>
                  {[viewingLog.first_name, viewingLog.last_name]
                    .filter(Boolean)
                    .join(' ') ||
                    viewingLog.email ||
                    'System'}
                </dd>
              </div>
              <div>
                <dt>Record</dt>
                <dd>
                  {String(viewingLog.entity_type || '').replaceAll('_', ' ')} #
                  {viewingLog.entity_id ?? '—'}
                </dd>
              </div>
              <div>
                <dt>Timestamp</dt>
                <dd>
                  {viewingLog.created_at
                    ? new Date(viewingLog.created_at).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>{viewingLog.reason || 'No reason supplied'}</dd>
              </div>
            </dl>
            <div className='audit-detail-changes'>
              <section>
                <h3>Before</h3>
                <p>{prettyAuditDetails(viewingLog.old_values)}</p>
              </section>
              <section>
                <h3>After</h3>
                <p>{prettyAuditDetails(viewingLog.new_values)}</p>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
