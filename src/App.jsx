import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import DuePayments from './pages/DuePayments'
import Invoices from './pages/Invoices'
import Tickets from './pages/Tickets'
import Wishes from './pages/Wishes'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/due-payments" element={<DuePayments />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/wishes" element={<Wishes />} />
      </Routes>
    </Layout>
  )
}
