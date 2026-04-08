import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService } from '../services/api';
import './Dashboard.css';

const ServiceDashboard = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const previousRequestsRef = useRef([]);
    const [toast, setToast] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const toggleRow = (id) => {
        setExpandedRows(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const openDetailsModal = (request) => {
        setSelectedRequest(request);
        setShowDetailsModal(true);
    };
    
    const [newRequest, setNewRequest] = useState({
        serviceName: user?.serviceName || user?.username || '',
        items: [{ productName: '', quantity: 1, unit: '' }]
    });

    useEffect(() => {
        loadData();
        // Refresh automatique toutes les 30 secondes
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const serviceName = user?.serviceName || user?.username;
            let requestsData;
            if (serviceName) {
                requestsData = await requestService.getRequestsByService(serviceName);
            } else {
                requestsData = await requestService.getAllRequests();
            }
            
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

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        try {
            await requestService.createRequest(
                user?.serviceName || user?.username || 'Service',
                newRequest.items
            );
            setShowCreateModal(false);
            setNewRequest({ serviceName: '', items: [{ productName: '', quantity: 1, unit: '' }] });
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

    const getStatusBadge = (status) => {
        // Handle both string and number (enum) status
        const statusStr = String(status);
        const statusMap = {
            '0': { class: 'status-pending', label: 'En attente Contrôle' },
            'Pending': { class: 'status-pending', label: 'En attente Contrôle' },
            '1': { class: 'status-info', label: 'Validé Contrôle' },
            'ControlValidated': { class: 'status-info', label: 'Validé Contrôle' },
            '2': { class: 'status-warning', label: 'Modifié Contrôle' },
            'ControlModified': { class: 'status-warning', label: 'Modifié Contrôle' },
            '3': { class: 'status-rejected', label: 'Bloqué Contrôle' },
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

    if (loading) return <div className="loading">Chargement...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>📋 Espace Service</h1>
                <div className="user-info">
                    <span className="role-badge role-service">{user?.username}</span>
                    <button onClick={() => { localStorage.clear(); window.location.hash = '#/login'; }} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </header>

            {toast && (
                <div className="toast">
                    {toast}
                </div>
            )}
            <div className="dashboard-content">
                <div className="actions">
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                        ➕ Nouvelle Demande
                    </button>
                </div>

                <div className="requests-section">
                    <h2>📝 Mes Demandes</h2>
                    {requests.length === 0 ? (
                        <p className="no-data">Aucune demande</p>
                    ) : (
                        <div className="requests-table">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Date</th>
                                        <th>Service</th>
                                        <th>Statut</th>
                                        <th>Suivi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(req => (
                                        <React.Fragment key={req.id}>
                                            <tr onClick={() => toggleRow(req.id)} style={{cursor: 'pointer'}}>
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
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Request Modal */}
            {showCreateModal && (
                <div className="modal" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📝 Nouvelle Demande</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateRequest}>
                            <div className="form-section">
                                <label>🏢 Service</label>
                                <div className="service-display">
                                    {user?.serviceName || user?.username || 'Non défini'}
                                </div>
                            </div>
                            <div className="form-section">
                                <label>📦 Articles</label>
                                <div className="items-container">
                                    {newRequest.items.map((item, index) => (
                                        <div key={index} className="item-card">
                                            <div className="item-number">{index + 1}</div>
                                            <div className="item-fields">
                                                <input
                                                    type="text"
                                                    placeholder="Nom du produit"
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(index, 'productName', e.target.value)}
                                                    className="item-input-large"
                                                    required
                                                />
                                                <div className="item-quantity">
                                                    <input
                                                        type="number"
                                                        placeholder="Qté"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                                                        required
                                                    />
                                                    <select
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                        required
                                                    >
                                                        <option value="">Unité</option>
                                                        <option value="KG">KG</option>
                                                        <option value="Litre">Litre</option>
                                                        <option value="Pièce">Pièce</option>
                                                    </select>
                                                </div>
                                            </div>
                                            {newRequest.items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="btn-remove-item">🗑️</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addItem} className="btn-add-item">
                                    <span>➕</span> Ajouter un article
                                </button>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-cancel">Annuler</button>
                                <button type="submit" className="btn-submit">
                                    <span>✓</span> Créer la demande
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Details Modal */}
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
                                                <span className="item-name">{item.productName}</span>
                                                <span className="item-qty">{item.quantity} {item.unit}</span>
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
                                        ) : null}
                                        
                                        {selectedRequest.economatBy ? (
                                            <div className={`timeline-item ${selectedRequest.status === 'Approved' ? 'completed' : 'rejected'}`}>
                                                <div className="timeline-dot"></div>
                                                <div className="timeline-content">
                                                    <span className="timeline-title">Économat</span>
                                                    <span className="timeline-user">{selectedRequest.economatBy}</span>
                                                    {selectedRequest.economatDate && <span className="timeline-date">{new Date(selectedRequest.economatDate).toLocaleString()}</span>}
                                                    {selectedRequest.economatReason && <span className="timeline-reason">{selectedRequest.economatReason}</span>}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => { setShowDetailsModal(false); setSelectedRequest(null); }} className="btn-cancel">Fermer</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceDashboard;