import React from 'react';
import { useAuth } from '../context/AuthContext';
import ServiceDashboard from './ServiceDashboard';
import ControlDashboard from './ControlDashboard';
import DirectorDashboard from './DirectorDashboard';
import EconomatDashboard from './EconomatDashboard';
import AdminDashboard from './AdminDashboard';
import Dashboard from './Dashboard';

const RoleBasedDashboard = () => {
    const { user, hasRole } = useAuth();

    // Admin dashboard first
    if (hasRole('Admin')) {
        return <AdminDashboard />;
    }
    
    // Role-specific dashboards
    if (hasRole('Service')) {
        return <ServiceDashboard />;
    }
    
    if (hasRole('Control')) {
        return <ControlDashboard />;
    }
    
    if (hasRole('Directeur')) {
        return <DirectorDashboard />;
    }
    
    if (hasRole('Economat')) {
        return <EconomatDashboard />;
    }

    // Fallback to original Dashboard for other roles
    return <Dashboard />;
};

export default RoleBasedDashboard;