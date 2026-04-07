import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: '2rem',
        maxWidth: 'calc(100vw - 240px)',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
