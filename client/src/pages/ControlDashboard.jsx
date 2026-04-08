import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService } from '../services/api';
import './Dashboard.css';

const ControlDashboard = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState('');
    const [reason, setReason] = useState('');
    const [showItemsModal, setShowItemsModal] = useState(false);
    const [editingItems, setEditingItems] = useState([]);
    const [modificationReason, setModificationReason] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    const previousRequestsRef = useRef([]);
    const [toast, setToast] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showStats, setShowStats] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const requestsData = await requestService.getAllRequests();
            console.log('API Response:', requestsData);
            
            // Detect new requests or status changes
            const prevIds = new Set(previousRequestsRef.current.map(r => r.id));
            const newIds = new Set(requestsData.map(r => r.id));
            
            const newlyAdded = requestsData.filter(r => !prevIds.has(r.id));
            const changed = requestsData.filter(r => {
                const prev = previousRequestsRef.current.find(p => p.id === r.id);
                return prev && prev.status !== r.status;
            });
            
            // Show toast for new and changed rows
            if (newlyAdded.length > 0) {
                setToast(`Nouvelle demande #${newlyAdded[0].id} créée`);
                setTimeout(() => setToast(null), 7000);
            }
            if (changed.length > 0) {
                setToast(`Demande #${changed[0].id} - Statut changé`);
                setTimeout(() => setToast(null), 7000);
            }
            
            previousRequestsRef.current = requestsData;
            setRequests(requestsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setReason('');
        setShowReasonModal(true);
    };

    const handleAction = async (e) => {
        e.preventDefault();
        console.log('Action type:', actionType, 'Request ID:', selectedRequest?.id, 'Current status:', selectedRequest?.status, 'statusText:', selectedRequest?.statusText);
        try {
            const reqId = selectedRequest.id;
            
            if (actionType === 'validate') {
                await requestService.controlValidate(reqId, reason);
            } else if (actionType === 'block') {
                await requestService.controlBlock(reqId, reason);
            }
            
            setShowReasonModal(false);
            loadData();
        } catch (err) {
            console.error('Action error:', err);
            alert('Error: ' + (err.response?.data?.message || 'Action failed'));
        }
    };

    const openItemsModal = (request) => {
        setSelectedRequest(request);
        setEditingItems(request.items.map(item => ({
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit
        })));
        setModificationReason('');
        setShowItemsModal(true);
    };

    const openDetailsModal = (request) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };

    const handleItemsChange = (index, field, value) => {
        const newItems = [...editingItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setEditingItems(newItems);
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const addItem = () => {
        setEditingItems([...editingItems, { productName: '', quantity: 1, unit: 'KG' }]);
    };

    const removeItem = (index) => {
        if (editingItems.length > 1) {
            setEditingItems(editingItems.filter((_, i) => i !== index));
        }
    };

    const handleSaveItems = async (e) => {
        e.preventDefault();
        try {
            // Validate items and ensure unit defaults to KG
            const validItems = editingItems
                .filter(item => item.productName.trim() !== '')
                .map(item => ({
                    ...item,
                    unit: item.unit || 'KG'
                }));
            if (validItems.length === 0) {
                alert('Au moins un article est requis');
                return;
            }

            // Validate reason is required
            if (!modificationReason.trim()) {
                alert('La raison de modification est requise');
                return;
            }

            await requestService.updateRequestItems(selectedRequest.id, validItems, modificationReason);
            setShowItemsModal(false);
            loadData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Failed to update items'));
        }
    };

    const getStatusBadge = (status) => {
        // Use StatusText if available, otherwise fall back to status
        const statusStr = status.statusText || String(status);
        const statusMap = {
            '0': { class: 'status-pending', label: 'En attente' },
            'Pending': { class: 'status-pending', label: 'En attente' },
            '1': { class: 'status-info', label: 'Validé' },
            'ControlValidated': { class: 'status-info', label: 'Validé Contrôle' },
            '2': { class: 'status-warning', label: 'Modifié' },
            'ControlModified': { class: 'status-warning', label: 'Modifié Contrôle' },
            '3': { class: 'status-rejected', label: 'Bloqué' },
            'ControlBlocked': { class: 'status-rejected', label: 'Bloqué Contrôle' },
            '4': { class: 'status-info', label: 'Validé Directeur' },
            'DirectorValidated': { class: 'status-info', label: 'Validé Directeur' },
            '5': { class: 'status-warning', label: 'Modifié Directeur' },
            'DirectorModified': { class: 'status-warning', label: 'Modifié Directeur' },
            '6': { class: 'status-rejected', label: 'Bloqué Directeur' },
            'DirectorBlocked': { class: 'status-rejected', label: 'Bloqué Directeur' },
            '7': { class: 'status-approved', label: 'Approuvé' },
            'Approved': { class: 'status-approved', label: 'Approuvé' },
            '8': { class: 'status-rejected', label: 'Rejeté' },
            'Rejected': { class: 'status-rejected', label: 'Rejeté' },
            '9': { class: 'status-approved', label: 'Finalisé' },
            'Finalized': { class: 'status-approved', label: 'Finalisé' }
        };
        const info = statusMap[statusStr] || { class: '', label: statusStr };
        return <span className={`status-badge ${info.class}`}>{info.label}</span>;
    };

    // Get available actions based on status
    const getActions = (req) => {
        const actions = [];
        
        // Check status - handle both string (statusText) and number (enum) status
        const statusText = req.statusText;
        const statusNum = typeof req.status === 'number' ? req.status : parseInt(req.status);
        
        console.log('Checking status - statusText:', statusText, 'statusNum:', statusNum);
        
        // Show actions for pending requests (status 0 or 'Pending')
        if (statusText === 'Pending' || statusNum === 0) {
            console.log('Status is Pending - showing all actions');
            actions.push({ type: 'edit-items', label: '✎ Articles', class: 'btn-edit' });
            actions.push({ type: 'validate', label: '✓ Valider', class: 'btn-approve' });
            actions.push({ type: 'block', label: '✕ Bloquer', class: 'btn-reject' });
        }
        
        // Allow editing items for validated requests (to modify before sending to Director)
        if (statusText === 'ControlValidated' || statusNum === 1) {
            console.log('Status is ControlValidated - showing edit-items');
            actions.push({ type: 'edit-items', label: '✎ Articles', class: 'btn-edit' });
        }
        
        // Also allow validation/blocking for requests that were modified
        if (statusText === 'ControlModified' || statusNum === 2) {
            console.log('Status is ControlModified - showing validate/block');
            actions.push({ type: 'validate', label: '✓ Valider', class: 'btn-approve' });
            actions.push({ type: 'block', label: '✕ Bloquer', class: 'btn-reject' });
        }
        
        console.log('Actions:', actions);
        return actions;
    };

    // Calculate status counts
    const statusCounts = {
        'En attente': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'Pending' || s === '0';
        }).length,
        'Validé': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'ControlValidated' || s === '1';
        }).length,
        'Modifié': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'ControlModified' || s === '2';
        }).length,
        'Bloqué': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'ControlBlocked' || s === '3';
        }).length,
        'Validé Directeur': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'DirectorValidated' || s === '4';
        }).length,
        'Approuvé': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'Approved' || s === '7';
        }).length,
        'Rejeté': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'Rejected' || s === '8';
        }).length,
        'Finalisé': requests.filter(r => {
            const s = r.statusText || String(r.status);
            return s === 'Finalized' || s === '9';
        }).length,
    };

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>🔍 Espace Contrôle</h1>
                <div className="user-info">
                    <span className="role-badge role-control">{user?.username}</span>
                    <button onClick={() => { localStorage.clear(); window.location.hash = '#/login'; }} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </header>

            {/* Stats Section */}
            <div className="stats-section">
                <div className="stats-toggle">
                    <button 
                        onClick={() => setShowStats(!showStats)} 
                        className="btn-toggle-stats"
                    >
                        {showStats ? '▼' : '▶'} Stats
                    </button>
                </div>
                {showStats && (
                    <div className="stats-grid">
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status} className={`stat-card ${count > 0 ? 'stat-active' : ''}`}>
                                <div className="stat-value">{count}</div>
                                <div className="stat-label">{status}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="dashboard-content">

                <div className="requests-section">
                    <h2>📋 Toutes les demandes</h2>
                    {requests.length === 0 ? (
                        <p className="no-data">Aucune demande</p>
                    ) : (
                        <div className="requests-table-wrapper">
                            <div className="requests-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Date</th>
                                            <th>Service</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                            <th>Détails</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map(req => (
                                            <React.Fragment key={req.id}>
                                                <tr>
                                                    <td><span className="cell-mobile-label">ID: </span>#{req.id}</td>
                                                    <td><span className="cell-mobile-label">Date: </span>{new Date(req.requestDate).toLocaleDateString()}</td>
                                                    <td className="cell-service"><span className="cell-mobile-label">Service: </span>{req.serviceName}</td>
                                                    <td>
                                                        {getStatusBadge(req.status)}
                                                        {req.controlReason && req.status !== 'Pending' && req.status !== 0 && (
                                                            <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                                <em>Motif: {req.controlReason}</em>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons action-buttons-responsive">
                                                            {getActions(req).length > 0 ? (
                                                                getActions(req).map((action, idx) => (
                                                                    <button 
                                                                        key={idx}
                                                                        onClick={() => action.type === 'edit-items' ? openItemsModal(req) : openActionModal(req, action.type)}
                                                                        className={`${action.class} btn-action-sm`}
                                                                    >
                                                                        {action.label}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <button 
                                                            onClick={() => openDetailsModal(req)}
                                                            className="btn-details"
                                                        >
                                                            📋 Détails
                                                        </button>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>
                            {actionType === 'validate' && '✅ Valider la demande'}
                            {actionType === 'modify' && '✎ Modifier la demande'}
                            {actionType === 'block' && '✕ Bloquer la demande'}
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
                                    placeholder={
                                        actionType === 'validate' 
                                            ? 'Ajouter un commentaire...' 
                                            : 'Expliquer le motif de modification ou de blocage...'
                                    }
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className={
                                    actionType === 'validate' ? 'btn-approve' : 
                                    actionType === 'block' ? 'btn-reject' : 'btn-warning'
                                }>
                                    Confirmer
                                </button>
                                <button type="button" onClick={() => setShowReasonModal(false)} className="btn-secondary">
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Items Modal */}
            {showItemsModal && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>✎ Modifier les articles</h3>
                        <form onSubmit={handleSaveItems}>
                            <div className="items-editor">
                                {editingItems.map((item, index) => (
                                    <div key={index} className="item-row">
                                        <input
                                            type="text"
                                            placeholder="Nom du produit"
                                            value={item.productName}
                                            readOnly
                                            className="item-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                            title="Le nom du produit ne peut pas être modifié"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qté"
                                            value={item.quantity}
                                            onChange={(e) => handleItemsChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="item-input-small"
                                            min="0"
                                            step="0.01"
                                        />
                                        <select
                                            value={item.unit || 'KG'}
                                            onChange={(e) => handleItemsChange(index, 'unit', e.target.value)}
                                            className="item-input-small unit-select"
                                            required
                                        >
                                            <option value="KG">KG</option>
                                            <option value="Litre">Litre</option>
                                            <option value="Pièce">Pièce</option>
                                        </select>
                                        <span style={{ color: '#999', fontSize: '12px' }}>🔒</span>
                                    </div>
                                ))}
                            </div>
                            <div className="form-group">
                                <label>Motif de modification (obligatoire)</label>
                                <textarea
                                    value={modificationReason}
                                    onChange={(e) => setModificationReason(e.target.value)}
                                    required
                                    placeholder="Expliquer les modifications apportées..."
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-approve">
                                    Enregistrer
                                </button>
                                <button type="button" onClick={() => setShowItemsModal(false)} className="btn-secondary">
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <div className="modal" onClick={() => { setShowDetailsModal(false); setSelectedRequest(null); }}>
                    <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Demande #{selectedRequest.id}</h3>
                            <button className="modal-close" onClick={() => { setShowDetailsModal(false); setSelectedRequest(null); }}>✕</button>
                        </div>
                        <div className="details-content">
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <span className="detail-icon">🏢</span>
                                    <span>Informations</span>
                                </div>
                                <div className="detail-card-body">
                                    <div className="detail-row">
                                        <span className="detail-label">Service</span>
                                        <span className="detail-value">{selectedRequest.serviceName}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Demandeur</span>
                                        <span className="detail-value">{selectedRequest.requestedByUserName}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Date</span>
                                        <span className="detail-value">{new Date(selectedRequest.requestDate).toLocaleString()}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Statut</span>
                                        <span className="detail-value">{getStatusBadge(selectedRequest.status)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <span className="detail-icon">📦</span>
                                    <span>Articles ({selectedRequest.items.length})</span>
                                </div>
                                <div className="detail-card-body">
                                    <div className="items-list">
                                        {selectedRequest.items.map((item, idx) => (
                                            <div key={idx} className="item-detail">
                                                <span className="item-number">{idx + 1}</span>
                                                <span className="item-name">
                                                    {item.productName}
                                                    {item.productId && (
                                                        <span style={{ color: 'green', fontSize: '11px', marginLeft: '5px' }}>
                                                            ✅ Lié
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="item-qty">
                                                    {item.quantity} {item.unit}
                                                    {item.quantiteDonne !== null && item.quantiteDonne !== undefined && (
                                                        <span style={{ color: '#667eea', fontWeight: '600', marginLeft: '8px' }}>
                                                            → Donné: {item.quantiteDonne} {item.unit}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="detail-card">
                                <div className="detail-card-header">
                                    <span className="detail-icon">📊</span>
                                    <span>Suivi du traitement</span>
                                </div>
                                <div className="detail-card-body">
                                    <div className="workflow-timeline-modern">
                                        {selectedRequest.controlBy ? (
                                            <div className="timeline-item completed">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Contrôle</span>
                                                    <span className="timeline-user">{selectedRequest.controlBy}</span>
                                                    {selectedRequest.controlDate && <span className="timeline-date">{new Date(selectedRequest.controlDate).toLocaleString()}</span>}
                                                    {selectedRequest.controlReason && <span className="timeline-reason">{selectedRequest.controlReason}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="timeline-item pending">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Contrôle</span>
                                                    <span className="timeline-pending">En attente...</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {selectedRequest.directorBy ? (
                                            <div className="timeline-item completed">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Directeur</span>
                                                    <span className="timeline-user">{selectedRequest.directorBy}</span>
                                                    {selectedRequest.directorDate && <span className="timeline-date">{new Date(selectedRequest.directorDate).toLocaleString()}</span>}
                                                    {selectedRequest.directorReason && <span className="timeline-reason">{selectedRequest.directorReason}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="timeline-item pending">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Directeur</span>
                                                    <span className="timeline-pending">En attente...</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {selectedRequest.economatBy ? (
                                            <div className="timeline-item completed">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Économat</span>
                                                    <span className="timeline-user">{selectedRequest.economatBy}</span>
                                                    {selectedRequest.economatDate && <span className="timeline-date">{new Date(selectedRequest.economatDate).toLocaleString()}</span>}
                                                    {selectedRequest.economatReason && <span className="timeline-reason">{selectedRequest.economatReason}</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="timeline-item pending">
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Économat</span>
                                                    <span className="timeline-pending">En attente...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {toast && (
                <div className="toast">
                    {toast}
                </div>
            )}
        </div>
    );
};

export default ControlDashboard;