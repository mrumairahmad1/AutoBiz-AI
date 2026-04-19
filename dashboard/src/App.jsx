// App.jsx

import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { RoleGuard } from './context/RoleGuard'

import Landing        from './pages/Landing'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Chat           from './pages/Chat'
import Inventory      from './pages/Inventory'
import Sales          from './pages/Sales'
import PurchaseOrders from './pages/PurchaseOrders'
import UserManagement from './pages/UserManagement'
import DBSetup        from './pages/DBSetup'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/"        element={<Landing />} />
            <Route path="/login"   element={<Login />} />

            {/* All authenticated routes */}
            <Route path="/chat"      element={<RoleGuard><Chat /></RoleGuard>} />
            <Route path="/dashboard" element={<RoleGuard><Dashboard /></RoleGuard>} />
            <Route path="/inventory" element={<RoleGuard><Inventory /></RoleGuard>} />
            <Route path="/sales"     element={<RoleGuard><Sales /></RoleGuard>} />
            <Route path="/orders"    element={<RoleGuard><PurchaseOrders /></RoleGuard>} />

            {/* Admin + Manager only */}
            <Route path="/users"    element={<RoleGuard roles={['admin']}><UserManagement /></RoleGuard>} />
            <Route path="/db-setup" element={<RoleGuard roles={['admin']}><DBSetup /></RoleGuard>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}