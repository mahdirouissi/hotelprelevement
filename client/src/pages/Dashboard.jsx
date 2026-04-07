import React, { useState, useEffect, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService, serviceService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
    const { user, hasRole } = useAuth();
    const [requests, setRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'validate', 'modify', 'block'
    const [reason, setReason] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    
    // Date filter states
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    
    // Column sort/filter states
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [filterStatus, setFilterStatus] = useState('');
    const [filterService, setFilterService] = useState('');
    
    const [newRequest, setNewRequest] = useState({
        serviceId: '',
        items: [{ productName: '', quantity: 1, unit: '' }]
    });
    
    // Details modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const requestsData = await requestService.getAllRequests();
            setRequests(requestsData);
            
            if (hasRole('Service') || hasRole('Admin')) {
                const servicesData = await serviceService.getAllServices();
                setServices(servicesData);
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };
    
    // Filter requests by date, status, and service
    const filteredRequests = requests.filter(req => {
        const reqDate = new Date(req.requestDate);
        if (filterDate && reqDate.getDate() !== parseInt(filterDate)) return false;
        if (filterMonth && (reqDate.getMonth() + 1) !== parseInt(filterMonth)) return false;
        if (filterYear && reqDate.getFullYear() !== parseInt(filterYear)) return false;
        if (filterStatus && req.statusText !== filterStatus) return false;
        if (filterService && req.serviceName !== filterService) return false;
        return true;
    });
    
    // Sort filtered requests
    const sortedRequests = [...filteredRequests].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle nested properties
        if (sortConfig.key === 'status') {
            aValue = a.statusText;
            bValue = b.statusText;
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '⇅';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        try {
            await requestService.createRequest(
                parseInt(newRequest.serviceId),
                newRequest.items
            );
            setShowCreateModal(false);
            setNewRequest({ serviceId: '', items: [{ productName: '', quantity: 1, unit: '' }] });
            loadData();
        } catch (err) {
            alert('Error creating request');
        }
    };

    const addItem = () => {
        setNewRequest({
            ...newRequest,
            items: [...newRequest.items, { productName: '', quantity: 1, unit: '' }]
        });
    };

    const updateItem = (index, field, value) => {
        const updatedItems = [...newRequest.items];
        updatedItems[index][field] = value;
        setNewRequest({ ...newRequest, items: updatedItems });
    };

    const removeItem = (index) => {
        const updatedItems = newRequest.items.filter((_, i) => i !== index);
        setNewRequest({ ...newRequest, items: updatedItems });
    };

    // Open reason modal for action
    const openActionModal = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setReason('');
        setShowReasonModal(true);
    };

    // Handle action with reason
    const handleAction = async (e) => {
        e.preventDefault();
        
        try {
            const reqId = selectedRequest.id;
            
            if (hasRole('Control')) {
                if (actionType === 'validate') await requestService.controlValidate(reqId, reason);
                else if (actionType === 'block') await requestService.controlBlock(reqId, reason);
            }
            else if (hasRole('Directeur')) {
                if (actionType === 'validate') await requestService.directorValidate(reqId, reason);
                else if (actionType === 'block') await requestService.directorBlock(reqId, reason);
            }
            else if (hasRole('Economat')) {
                if (actionType === 'validate') await requestService.economatValidate(reqId, reason);
                else if (actionType === 'block') await requestService.economatReject(reqId, reason);
            }
            
            setShowReasonModal(false);
            loadData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Action failed'));
        }
    };

    // Open details modal
    const openDetailsModal = async (request) => {
        try {
            const freshRequest = await requestService.getRequestById(request.id);
            setSelectedRequest(freshRequest);
            setShowDetailsModal(true);
        } catch (err) {
            alert('Error loading request details');
        }
    };

    const getStatusBadge = (status) => {
        const statusStr = String(status);
        const statusMap = {
            'Pending': { class: 'status-pending', label: 'En attente Contrôle' },
            '0': { class: 'status-pending', label: 'En attente Contrôle' },
            'ControlValidated': { class: 'status-info', label: 'Validé Contrôle' },
            '1': { class: 'status-info', label: 'Validé Contrôle' },
            'ControlModified': { class: 'status-warning', label: 'Modifié Contrôle' },
            '2': { class: 'status-warning', label: 'Modifié Contrôle' },
            'ControlBlocked': { class: 'status-rejected', label: 'Bloqué Contrôle' },
            '3': { class: 'status-rejected', label: 'Bloqué Contrôle' },
            'DirectorValidated': { class: 'status-info', label: 'Validé Directeur' },
            '4': { class: 'status-info', label: 'Validé Directeur' },
            'DirectorModified': { class: 'status-warning', label: 'Modifié Directeur' },
            '5': { class: 'status-warning', label: 'Modifié Directeur' },
            'DirectorBlocked': { class: 'status-rejected', label: 'Bloqué Directeur' },
            '6': { class: 'status-rejected', label: 'Bloqué Directeur' },
            'Approved': { class: 'status-approved', label: 'Approuvé' },
            '7': { class: 'status-approved', label: 'Approuvé' },
            'Rejected': { class: 'status-rejected', label: 'Rejeté' },
            '8': { class: 'status-rejected', label: 'Rejeté' },
            'Finalized': { class: 'status-approved', label: 'Finalisé' },
            '9': { class: 'status-approved', label: 'Finalisé' }
        };
        const info = statusMap[statusStr] || { class: '', label: statusStr };
        return <span className={`status-badge ${info.class}`}>{info.label}</span>;
    };

    // Get available actions based on role and status
    const getActions = (request) => {
        const actions = [];
        const status = String(request.status);
        
        // Control: can validate/block pending (0) or modified (2)
        if (hasRole('Control') && (status === 'Pending' || status === '0')) {
            actions.push({ type: 'validate', label: 'Valider', class: 'btn-approve' });
            actions.push({ type: 'block', label: 'Bloquer', class: 'btn-reject' });
        }
        if (hasRole('Control') && (status === 'ControlModified' || status === '2')) {
            actions.push({ type: 'validate', label: 'Valider', class: 'btn-approve' });
            actions.push({ type: 'block', label: 'Bloquer', class: 'btn-reject' });
        }
        
        // Directeur: can validate/block ControlValidated (1) or ControlModified (2)
        if (hasRole('Directeur') && (status === 'ControlValidated' || status === '1' || status === 'ControlModified' || status === '2')) {
            actions.push({ type: 'validate', label: 'Valider', class: 'btn-approve' });
            actions.push({ type: 'block', label: 'Bloquer', class: 'btn-reject' });
        }
        
        // Economat: can only approve/reject DirectorValidated (4)
        if (hasRole('Economat') && (status === 'DirectorValidated' || status === '4')) {
            actions.push({ type: 'validate', label: 'Approuver', class: 'btn-approve' });
            actions.push({ type: 'block', label: 'Rejeter', class: 'btn-reject' });
        }
        
        return actions;
    };

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>Bienvenue, {user?.username}</h1>
                <div className="user-info">
                    <span className="role-badge">{user?.role}</span>
                    <button onClick={() => { localStorage.clear(); window.location.hash = '#/login'; }} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                {(hasRole('Service') || hasRole('Admin')) && (
                    <div className="actions">
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            Nouvelle Demande
                        </button>
                    </div>
                )}

                <div className="requests-section">
                    <h2>Demandes</h2>
                    
                    {/* Date Filters */}
                    <div className="filter-bar">
                        <div className="filter-group">
                            <label>Jour:</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="31" 
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                placeholder="JJ"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Mois:</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="12" 
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                placeholder="MM"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Année:</label>
                            <input 
                                type="number" 
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                placeholder="AAAA"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Statut:</label>
                            <select 
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">Tous</option>
                                <option value="Pending">En attente</option>
                                <option value="ControlValidated">Contrôlé</option>
                                <option value="DirectorValidated">Directeur</option>
                                <option value="EconomatValidated">Économat</option>
                                <option value="Finalized">Finalisé</option>
                                <option value="Rejected">Rejeté</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Service:</label>
                            <select 
                                value={filterService}
                                onChange={(e) => setFilterService(e.target.value)}
                            >
                                <option value="">Tous</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            className="btn-clear-filter"
                            onClick={() => {
                                setFilterDate('');
                                setFilterMonth('');
                                setFilterYear('');
                                setFilterStatus('');
                                setFilterService('');
                            }}
                        >
                            Effacer
                        </button>
                    </div>
                    
                    {requests.length === 0 ? (
                        <p className="no-data">Aucune demande</p>
                    ) : (
                        <div className="requests-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th onClick={() => handleSort('id')} className="sortable">ID {getSortIcon('id')}</th>
                                        <th onClick={() => handleSort('requestDate')} className="sortable">Date {getSortIcon('requestDate')}</th>
                                        <th onClick={() => handleSort('serviceName')} className="sortable">Service {getSortIcon('serviceName')}</th>
                                        <th onClick={() => handleSort('status')} className="sortable">Statut {getSortIcon('status')}</th>
                                        <th></th>
                                        <th>Workflow</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRequests.map(req => (
                                        <tr key={req.id}>
                                            <td>#{req.id}</td>
                                            <td>{new Date(req.requestDate).toLocaleString()}</td>
                                            <td>{req.serviceName}</td>
                                            <td>{getStatusBadge(req.status)}</td>
                                            <td>
                                                <button 
                                                    onClick={() => openDetailsModal(req)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontWeight: '600',
                                                        fontSize: '13px'
                                                    }}
                                                >
                                                    📋 Détails
                                                </button>
                                            </td>
                                            <td>
                                                <div className="workflow-timeline">
                                                    {req.controlBy && (
                                                        <div className="workflow-step">
                                                            <span className="step-label">Contrôle:</span>
                                                            <span className="step-user">{req.controlBy}</span>
                                                            {req.controlDate && <span style={{ fontSize: '10px', color: '#888', marginLeft: '4px' }}>({new Date(req.controlDate).toLocaleString()})</span>}
                                                            {req.controlReason && <span className="step-reason" title={req.controlReason}>📝</span>}
                                                        </div>
                                                    )}
                                                    {req.directorBy && (
                                                        <div className="workflow-step">
                                                            <span className="step-label">Directeur:</span>
                                                            <span className="step-user">{req.directorBy}</span>
                                                            {req.directorDate && <span style={{ fontSize: '10px', color: '#888', marginLeft: '4px' }}>({new Date(req.directorDate).toLocaleString()})</span>}
                                                            {req.directorReason && <span className="step-reason" title={req.directorReason}>📝</span>}
                                                        </div>
                                                    )}
                                                    {req.economatBy && (
                                                        <div className="workflow-step">
                                                            <span className="step-label">Économat:</span>
                                                            <span className="step-user">{req.economatBy}</span>
                                                            {req.economatDate && <span style={{ fontSize: '10px', color: '#888', marginLeft: '4px' }}>({new Date(req.economatDate).toLocaleString()})</span>}
                                                            {req.economatReason && <span className="step-reason" title={req.economatReason}>📝</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    {getActions(req).map((action, idx) => (
                                                        <button 
                                                            key={idx}
                                                            onClick={() => openActionModal(req, action.type)}
                                                            className={action.class}
                                                        >
                                                            {action.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Request Modal */}
            {showCreateModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Nouvelle Demande</h3>
                        <form onSubmit={handleCreateRequest}>
                            <div className="form-group">
                                <label>Service</label>
                                <select 
                                    value={newRequest.serviceId}
                                    onChange={(e) => setNewRequest({...newRequest, serviceId: e.target.value})}
                                    required
                                >
                                    <option value="">Sélectionner un service</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="items-section">
                                <h4>Articles</h4>
                                {newRequest.items.map((item, index) => (
                                    <div key={index} className="item-row">
                                        <input
                                            type="text"
                                            placeholder="Nom du produit"
                                            value={item.productName}
                                            onChange={(e) => updateItem(index, 'productName', e.target.value)}
                                            required
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qté"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                            required
                                        />
                                        <input
                                            type="text"
                                            placeholder="Unité"
                                            value={item.unit}
                                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                        />
                                        {newRequest.items.length > 1 && (
                                            <button type="button" onClick={() => removeItem(index)} className="btn-remove">✕</button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addItem} className="btn-add-item">+ Ajouter</button>
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">Créer</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>
                            {actionType === 'validate' && 'Valider la demande'}
                            {actionType === 'modify' && 'Modifier la demande'}
                            {actionType === 'block' && 'Bloquer la demande'}
                        </h3>
                        <form onSubmit={handleAction}>
                            <div className="form-group">
                                <label>
                                    {actionType === 'validate' 
                                        ? 'Commentaire (optionnel)' 
                                        : 'Motif obligatoire'
                                    }
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required={actionType !== 'validate'}
                                    placeholder={actionType === 'validate' ? 'Ajouter un commentaire...' : 'Expliquer le motif...'}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className={actionType === 'validate' ? 'btn-approve' : actionType === 'block' ? 'btn-reject' : 'btn-warning'}>
                                    Confirmer
                                </button>
                                <button type="button" onClick={() => setShowReasonModal(false)} className="btn-secondary">Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>📋 Détails de la demande #{selectedRequest.id}</h3>
                        
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Service:</strong> {selectedRequest.serviceName}
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Demandeur:</strong> {selectedRequest.requestedByUserName}
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Date:</strong> {new Date(selectedRequest.requestDate).toLocaleString()}
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <strong>Statut:</strong> {getStatusBadge(selectedRequest.status)}
                            </div>
                        </div>

                        <h4 style={{ marginBottom: '10px' }}>Articles demandés:</h4>
                        <table className="items-table" style={{ marginBottom: '20px' }}>
                            <thead>
                                <tr>
                                    <th>Article</th>
                                    <th>Qté</th>
                                    <th>Unité</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedRequest.items?.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Workflow History */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '10px' }}>Historique:</h4>
                            
                            {selectedRequest.controlBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>🔍 Contrôle:</strong> {selectedRequest.controlBy}
                                    {selectedRequest.controlDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.controlDate).toLocaleString()})</span>}
                                    {selectedRequest.controlReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.controlReason}</em></div>}
                                </div>
                            )}
                            
                            {selectedRequest.directorBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>👔 Directeur:</strong> {selectedRequest.directorBy}
                                    {selectedRequest.directorDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.directorDate).toLocaleString()})</span>}
                                    {selectedRequest.directorReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.directorReason}</em></div>}
                                </div>
                            )}
                            
                            {selectedRequest.economatBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>📦 Économat:</strong> {selectedRequest.economatBy}
                                    {selectedRequest.economatDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.economatDate).toLocaleString()})</span>}
                                    {selectedRequest.economatReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.economatReason}</em></div>}
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" onClick={() => setShowDetailsModal(false)} className="btn-secondary">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;