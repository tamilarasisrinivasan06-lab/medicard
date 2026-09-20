import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  MoreIcon,
  SearchIcon,
  UserIcon,
} from '../doctor/icons'
import './app-shell.css'

function isWithin(pathname, to) {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function AppShell({
  brandLabel = 'MediCard',
  portalLabel = 'Portal',
  title,
  subtitle,
  primary = [],
  more = [],
  home,
  user = {},
  avatar,
  unread = 0,
  notificationsTo,
  profileTo,
  profileMenu = [],
  onLogout,
  search,
  context = {},
}) {
  const location = useLocation()
  const homePath = home || primary[0]?.to
  const name = user.name || 'User'
  const initial = (avatar || name || 'U').slice(0, 1).toUpperCase()

  const moreActive = useMemo(() => more.some((item) => isWithin(location.pathname, item.to)), [more, location.pathname])
  const [moreToggle, setMoreToggle] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profileRef = useRef(null)
  const moreOpen = moreActive || moreToggle

  useEffect(() => {
    if (!menuOpen) return undefined
    function handle(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setMenuOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function handleSearch(event) {
    event.preventDefault()
    search?.onSubmit?.()
    setDrawerOpen(false)
  }

  return (
    <div className="doctor-shell">
      <div className="mc-shell">
        <aside className={`mc-sidebar ${drawerOpen ? 'is-open' : ''}`}>
          <div className="mc-brand">
            <span className="mc-brand-mark">M</span>
            <div>
              <strong>{brandLabel}</strong>
              <span>{portalLabel}</span>
            </div>
            <button type="button" className="mc-icon-btn mc-sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <CloseIcon size={18} />
            </button>
          </div>

          <nav className="mc-nav">
            {primary.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === homePath}
                className={({ isActive }) => `mc-nav-link${isActive ? ' is-active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {to === notificationsTo && unread > 0 && <em className="mc-nav-badge">{unread > 9 ? '9+' : unread}</em>}
              </NavLink>
            ))}

            {more.length > 0 && (
              <>
                <button
                  type="button"
                  className={`mc-more-btn${moreOpen ? ' is-open' : ''}`}
                  onClick={() => setMoreToggle((v) => !v)}
                  aria-expanded={moreOpen}
                >
                  <MoreIcon size={18} />
                  <span>More</span>
                  <ChevronDownIcon size={16} className="mc-more-chevron" />
                </button>
                <div className={`mc-subnav${moreOpen ? ' is-open' : ''}`}>
                  {more.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) => (isActive ? 'is-active' : '')}
                      onClick={() => setDrawerOpen(false)}
                    >
                      {Icon ? <Icon size={16} /> : null}
                      <span>{label}</span>
                      {to === notificationsTo && unread > 0 && <em className="mc-nav-badge">{unread > 9 ? '9+' : unread}</em>}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </nav>

          <div className="mc-sidebar-foot">
            <div className="mc-sidebar-pro-card">
              <div className="mc-pro-header">
                <span className="mc-pro-spark">✦</span>
                <span className="mc-pro-tag">MediCard Pro</span>
              </div>
              <p className="mc-pro-text">AI Clinical Co-pilot & Instant Multi-turn RAG is active.</p>
              <div className="mc-pro-status">
                <span className="mc-pro-dot" />
                <span>Gemini Flash 2.0 Connected</span>
              </div>
            </div>

            {profileTo && (
              <NavLink to={profileTo} className="mc-mini-profile" onClick={() => setDrawerOpen(false)}>
                <span className="mc-avatar">{initial}</span>
                <div>
                  <strong>{name}</strong>
                  <span>{user.meta || portalLabel}</span>
                </div>
              </NavLink>
            )}
            {onLogout && (
              <button type="button" className="mc-logout" onClick={onLogout}>
                <LogoutIcon size={18} />
                <span>Logout</span>
              </button>
            )}
          </div>
        </aside>

        {drawerOpen && <div className="mc-scrim" onClick={() => setDrawerOpen(false)} />}

        <div className="mc-main">
          <header className="mc-topbar">
            <button type="button" className="mc-icon-btn mc-menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
              <MenuIcon size={20} />
            </button>

            {title && (
              <div className="mc-topbar-title">
                <strong>{title}</strong>
                {subtitle && <span>{subtitle}</span>}
              </div>
            )}

            {search && (
              <form className="doc-topbar-search" onSubmit={handleSearch} role="search">
                <SearchIcon size={16} />
                <input
                  type="search"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || 'Search'}
                  aria-label={search.placeholder || 'Search'}
                />
              </form>
            )}

            <div className="mc-topbar-actions">
              {notificationsTo && (
                <NavLink to={notificationsTo} className="mc-icon-btn mc-bell" aria-label="Notifications">
                  <BellIcon size={20} />
                  {unread > 0 && <em>{unread > 9 ? '9+' : unread}</em>}
                </NavLink>
              )}

              <div className="mc-profile" ref={profileRef}>
                <button
                  type="button"
                  className="mc-profile-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className="mc-avatar">{initial}</span>
                  <span className="mc-profile-name">{name}</span>
                  <ChevronDownIcon size={15} />
                </button>

                {menuOpen && (
                  <div className="mc-menu" role="menu">
                    <div className="mc-menu-head">
                      <span className="mc-avatar mc-avatar-lg">{initial}</span>
                      <div>
                        <strong>{name}</strong>
                        <span>{user.meta || portalLabel}</span>
                      </div>
                    </div>

                    {profileTo && (
                      <NavLink to={profileTo} role="menuitem" onClick={() => setMenuOpen(false)}>
                        <UserIcon size={16} />
                        <span>My Profile</span>
                      </NavLink>
                    )}

                    {profileMenu.map(({ to, label, icon: Icon }) => (
                      <NavLink key={to} to={to} role="menuitem" onClick={() => setMenuOpen(false)}>
                        {Icon ? <Icon size={16} /> : null}
                        <span>{label}</span>
                      </NavLink>
                    ))}

                    {onLogout && (
                      <>
                        <div className="mc-menu-sep" />
                        <button
                          type="button"
                          className="mc-menu-danger"
                          onClick={() => {
                            setMenuOpen(false)
                            onLogout()
                          }}
                          role="menuitem"
                        >
                          <LogoutIcon size={16} />
                          <span>Logout</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="mc-content">
            <div className="mc-content-inner">
              <Outlet context={context} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppShell
