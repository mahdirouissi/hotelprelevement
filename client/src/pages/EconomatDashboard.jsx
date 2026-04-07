import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestService, serviceService } from '../services/api';
import { downloadPdf } from '../services/pdfService';
import './Dashboard.css';

const EconomatDashboard = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState('');
    const [reason, setReason] = useState('');
    const [expandedRows, setExpandedRows] = useState({});
    const [products, setProducts] = useState([]);
    const [productLinks, setProductLinks] = useState({});
    const [showCreateProduct, setShowCreateProduct] = useState(false);
    const [newProduct, setNewProduct] = useState({ code_Produit: '', designation: '' });
    const [productSearchModal, setProductSearchModal] = useState({ isOpen: false, itemId: null, search: '' });
    const [productSearchResults, setProductSearchResults] = useState([]);
    
    // Statistics modal state
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [productStats, setProductStats] = useState([]);
    const [processingStats, setProcessingStats] = useState(null);
    const [statsActiveTab, setStatsActiveTab] = useState('products');
    
    // Filter and sort states
    const [filterDate, setFilterDate] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterService, setFilterService] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const requestsData = await requestService.getAllRequests();
            const servicesData = await serviceService.getAllServices();
            setRequests(requestsData);
            setServices(servicesData);
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
    
    // Filter and sort functions
    const filteredRequests = requests.filter(req => {
        const reqDate = new Date(req.requestDate);
        if (filterDate && reqDate.getDate() !== parseInt(filterDate)) return false;
        if (filterMonth && (reqDate.getMonth() + 1) !== parseInt(filterMonth)) return false;
        if (filterYear && reqDate.getFullYear() !== parseInt(filterYear)) return false;
        if (filterStatus && req.statusText !== filterStatus) return false;
        if (filterService && req.serviceName !== filterService) return false;
        return true;
    });
    
    const sortedRequests = [...filteredRequests].sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
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

    const openActionModal = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setReason('');
        setShowReasonModal(true);
    };

    const openFinalizeModal = async (request) => {
        setSelectedRequest(request);
        setProductLinks({});
        setShowCreateProduct(false);
        setNewProduct({ code_Produit: '', designation: '' });
        setProductSearchModal({ isOpen: false, itemId: null, search: '' });
        setProductSearchResults([]);
        try {
            const productsData = await requestService.getProducts();
            setProducts(productsData);
            setShowFinalizeModal(true);
        } catch (err) {
            alert('Error loading products: ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const newProd = await requestService.createProduct(newProduct.code_Produit, newProduct.designation);
            setProducts([...products, newProd]);
            setNewProduct({ code_Produit: '', designation: '' });
            setShowCreateProduct(false);
            alert('Produit créé avec succès!');
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Failed to create product'));
        }
    };

    const handleFinalize = async (e) => {
        e.preventDefault();
        try {
            const links = Object.entries(productLinks).map(([itemId, productId]) => ({
                requestItemId: parseInt(itemId),
                productId: parseInt(productId)
            }));
            
            if (links.length === 0) {
                alert('Veuillez sélectionner au moins un produit');
                return;
            }
            
            await requestService.finalizeRequest(selectedRequest.id, links);
            setShowFinalizeModal(false);
            loadData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Finalization failed'));
        }
    };

    const openDetailsModal = async (request) => {
        try {
            // Fetch fresh data with product details
            const freshRequest = await requestService.getRequestById(request.id);
            setSelectedRequest(freshRequest);
            setShowDetailsModal(true);
        } catch (err) {
            alert('Error loading request details');
        }
    };

    const handleDownloadPdf = (request) => {
        try {
            downloadPdf(request);
        } catch (err) {
            alert('Error generating PDF: ' + err.message);
        }
    };

    const handleShowStatistics = async () => {
        try {
            const [productData, processingData] = await Promise.all([
                requestService.getProductStatistics(),
                requestService.getProcessingTimeStatistics()
            ]);
            setProductStats(productData);
            setProcessingStats(processingData);
            setShowStatsModal(true);
        } catch (err) {
            alert('Error loading statistics: ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        try {
            const reqId = selectedRequest.id;
            
            if (actionType === 'validate') {
                await requestService.economatValidate(reqId, reason);
            } else if (actionType === 'reject') {
                await requestService.economatReject(reqId, reason);
            }
            
            setShowReasonModal(false);
            loadData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Action failed'));
        }
    };

    const handleActionClick = (request, action) => {
        if (action.type === 'finalize') {
            openFinalizeModal(request);
        } else {
            openActionModal(request, action.type);
        }
    };

    const getStatusBadge = (status) => {
        // Use StatusText if available, otherwise fall back to status
        const statusStr = status.statusText || String(status);
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
            '9': { class: 'status-finalized', label: 'Finalisé' },
            'Finalized': { class: 'status-finalized', label: 'Finalisé' }
        };
        const info = statusMap[statusStr] || { class: '', label: statusStr };
        return <span className={`status-badge ${info.class}`}>{info.label}</span>;
    };

    // Get available actions based on status
    const getActions = (req) => {
        const actions = [];
        // Use StatusText if available, otherwise fall back to status
        const status = req.statusText || String(req.status);
        
        // Only show actions for requests that passed Director stage (validated by Director)
        if (status === 'DirectorValidated') {
            actions.push({ type: 'validate', label: '✓ Approuver', class: 'btn-approve' });
            actions.push({ type: 'reject', label: '✕ Rejeter', class: 'btn-reject' });
        }
        
        // Finalize action for approved requests
        if (status === 'Approved') {
            actions.push({ type: 'finalize', label: '✓ Finaliser', class: 'btn-finalize' });
        }
        
        return actions;
    };

    if (loading) return <div className="loading">Chargement...</div>;

    // Calculate stats - handle both string and number (enum) status
    const pendingCount = requests.filter(r => {
        const s = r.statusText || String(r.status);
        return s === 'DirectorValidated';
    }).length;
    const processedCount = requests.filter(r => {
        const s = r.statusText || String(r.status);
        return ['Approved', 'Rejected', 'Finalized'].includes(s);
    }).length;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <h1>📦 Espace Économat</h1>
                <div className="user-info">
                    <button 
                        onClick={handleShowStatistics}
                        style={{
                            marginRight: '15px',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                        }}
                    >
                        📊 Statistiques
                    </button>
                    <span className="role-badge role-economat">{user?.username}</span>
                    <button onClick={() => { localStorage.clear(); window.location.hash = '#/login'; }} className="btn-logout">
                        Déconnexion
                    </button>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="stats-section">
                    <div className="stat-card">
                        <div className="stat-number">{pendingCount}</div>
                        <div className="stat-label">En attente</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{processedCount}</div>
                        <div className="stat-label">Approuvées/Rejetées</div>
                    </div>
                </div>

                <div className="requests-section">
                    <h2>📋 Toutes les demandes</h2>
                    
                    {/* Filter Bar */}
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
                                        <th>Service</th>
                                        <th onClick={() => handleSort('status')} className="sortable">Statut {getSortIcon('status')}</th>
                                        <th>Actions</th>
                                        <th>Détails</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRequests.map(req => (
                                        <React.Fragment key={req.id}>
                                            <tr>
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
                                                <div className="action-buttons">
                                                    {getActions(req).length > 0 ? (
                                                        getActions(req).map((action, idx) => (
                                                            <button 
                                                                key={idx}
                                                                onClick={() => handleActionClick(req, action)}
                                                                className={action.class}
                                                            >
                                                                {action.label}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: '#999', fontSize: '12px' }}>-</span>
                                                    )}
                                                </div>
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

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>
                            {actionType === 'validate' && '✅ Approuver la demande'}
                            {actionType === 'modify' && '↩ Renvoyer la demande'}
                            {actionType === 'reject' && '✕ Rejeter la demande'}
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
                                            : 'Expliquer le motif...'
                                    }
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className={
                                    actionType === 'validate' ? 'btn-approve' : 
                                    actionType === 'reject' ? 'btn-reject' : 'btn-warning'
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

            {/* Finalize Modal */}
            {showFinalizeModal && selectedRequest && (
                <div className="modal">
                    <div className="modal-content" style={{ maxWidth: '800px' }}>
                        <h3>✅ Finaliser la demande #{selectedRequest.id}</h3>
                        <p style={{ marginBottom: '15px', color: '#666' }}>
                            Liez chaque article à un produit du stock:
                        </p>
                        
                        {/* Create Product Section - Moved to top */}
                        <div style={{ 
                            marginBottom: '20px', 
                            padding: '20px', 
                            background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)', 
                            borderRadius: '12px',
                            border: '1px solid #e0e5ff'
                        }}>
                            <button 
                                type="button" 
                                onClick={() => setShowCreateProduct(!showCreateProduct)}
                                style={{ 
                                    marginBottom: '16px', 
                                    padding: '12px 20px', 
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                                }}
                            >
                                {showCreateProduct ? '− Masquer création produit' : '+ Créer nouveau produit'}
                            </button>
                            
                            {showCreateProduct && (
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Code Produit</label>
                                        <input
                                            type="text"
                                            value={newProduct.code_Produit}
                                            onChange={(e) => setNewProduct({ ...newProduct, code_Produit: e.target.value })}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px 16px',
                                                border: '2px solid #e0e5ff',
                                                borderRadius: '10px',
                                                fontSize: '14px'
                                            }}
                                            placeholder="Ex: PROD-001"
                                        />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Désignation</label>
                                        <input
                                            type="text"
                                            value={newProduct.designation}
                                            onChange={(e) => setNewProduct({ ...newProduct, designation: e.target.value })}
                                            style={{ 
                                                width: '100%', 
                                                padding: '12px 16px',
                                                border: '2px solid #e0e5ff',
                                                borderRadius: '10px',
                                                fontSize: '14px'
                                            }}
                                            placeholder="Nom du produit"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleCreateProduct}
                                        style={{ 
                                            padding: '12px 24px', 
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '10px', 
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                        }}
                                    >
                                        Créer
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <form onSubmit={handleFinalize}>
                            <table className="items-table" style={{ marginBottom: '15px' }}>
                                <thead>
                                    <tr>
                                        <th>Article</th>
                                        <th>Qté</th>
                                        <th>Rechercher produit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedRequest.items.map((item) => {
                                        const selectedProduct = products.find(p => p.id == productLinks[item.id]);
                                        
                                        return (
                                            <tr key={item.id}>
                                                <td>{item.productName}</td>
                                                <td>{item.quantity} {item.unit}</td>
                                                <td>
                                                    {selectedProduct ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ 
                                                                padding: '6px 12px', 
                                                                background: 'linear-gradient(135deg, #e0f7e9 0%, #c8f0d6 100%)', 
                                                                borderRadius: '8px',
                                                                fontSize: '13px',
                                                                color: '#065f46',
                                                                border: '1px solid #a7f3d0'
                                                            }}>
                                                                {selectedProduct.code_Produit} - {selectedProduct.designation}
                                                            </span>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    setProductLinks({ ...productLinks, [item.id]: '' });
                                                                    setProductSearchModal({ isOpen: true, itemId: item.id, search: '' });
                                                                }}
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    background: '#f59e0b',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                ✏️ Changer
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            type="button"
                                                            onClick={() => setProductSearchModal({ isOpen: true, itemId: item.id, search: '' })}
                                                            style={{
                                                                padding: '10px 16px',
                                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                fontWeight: '600',
                                                                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                                                            }}
                                                        >
                                                            🔗 Lier un produit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            
                            <div className="modal-actions">
                                <button type="submit" className="btn-finalize">
                                    ✅ Finaliser
                                </button>
                                <button type="button" onClick={() => setShowFinalizeModal(false)} className="btn-secondary">
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Search Modal */}
            {productSearchModal.isOpen && (
                <div className="modal" onClick={() => setProductSearchModal({ isOpen: false, itemId: null, search: '' })}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h3>🔍 Rechercher un produit</h3>
                        
                        <input
                            type="text"
                            placeholder="Rechercher par code ou désignation..."
                            value={productSearchModal.search}
                            onChange={(e) => {
                                const search = e.target.value;
                                setProductSearchModal({ ...productSearchModal, search });
                                setProductSearchResults(
                                    products.filter(p => 
                                        p.code_Produit.toLowerCase().includes(search.toLowerCase()) ||
                                        p.designation.toLowerCase().includes(search.toLowerCase())
                                    )
                                );
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                marginBottom: '15px',
                                border: '2px solid #e0e5ff',
                                borderRadius: '10px',
                                fontSize: '14px'
                            }}
                            autoFocus
                        />
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {(productSearchResults.length > 0 ? productSearchResults : products).slice(0, 10).map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setProductLinks({ ...productLinks, [productSearchModal.itemId]: p.id.toString() });
                                        setProductSearchModal({ isOpen: false, itemId: null, search: '' });
                                    }}
                                    style={{
                                        padding: '12px',
                                        marginBottom: '8px',
                                        background: '#f8f9fa',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        border: '1px solid #e9ecef',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e9ecef'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                >
                                    <div style={{ fontWeight: '600', color: '#495057' }}>{p.code_Produit}</div>
                                    <div style={{ fontSize: '13px', color: '#6c757d' }}>{p.designation}</div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="modal-actions">
                            <button 
                                type="button" 
                                onClick={() => setProductSearchModal({ isOpen: false, itemId: null, search: '' })}
                                className="btn-secondary"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Statistics Modal */}
            {showStatsModal && (
                <div className="modal" onClick={() => setShowStatsModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
                        <h3>📊 Statistiques</h3>
                        
                        {/* Tabs */}
                        <div style={{ 
                            display: 'flex', 
                            marginBottom: '20px', 
                            borderBottom: '2px solid #e5e7eb',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setStatsActiveTab('products')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: statsActiveTab === 'products' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                    color: statsActiveTab === 'products' ? 'white' : '#666',
                                    borderRadius: '8px 8px 0 0',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    transition: 'all 0.3s'
                                }}
                            >
                                📦 Produits demandés
                            </button>
                            <button
                                onClick={() => setStatsActiveTab('processing')}
                                style={{
                                    padding: '12px 24px',
                                    border: 'none',
                                    background: statsActiveTab === 'processing' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                                    color: statsActiveTab === 'processing' ? 'white' : '#666',
                                    borderRadius: '8px 8px 0 0',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    transition: 'all 0.3s'
                                }}
                            >
                                ⏱️ Temps de traitement
                            </button>
                        </div>
                        
                        {/* Products Tab */}
                        {statsActiveTab === 'products' && (
                            productStats.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                    Aucune donnée disponible
                                </p>
                            ) : (
                                <div>
                                    {/* Bar Chart */}
                                    <div style={{ 
                                        marginBottom: '25px', 
                                        padding: '20px', 
                                        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)',
                                        borderRadius: '12px',
                                        border: '1px solid #e0e5ff'
                                    }}>
                                        <h4 style={{ marginBottom: '15px', color: '#475569' }}>📈 Graphique des demandes</h4>
                                        {productStats.slice(0, 8).map((stat, index) => {
                                            const maxCount = Math.max(...productStats.map(s => s.requestCount));
                                            const percentage = (stat.requestCount / maxCount) * 100;
                                            const colors = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];
                                            return (
                                                <div key={stat.productId} style={{ marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: '500', fontSize: '13px' }}>{stat.code_Produit}</span>
                                                        <span style={{ fontSize: '13px', color: '#666' }}>{stat.requestCount} demandes</span>
                                                    </div>
                                                    <div style={{ 
                                                        height: '24px', 
                                                        background: '#e5e7eb', 
                                                        borderRadius: '6px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{ 
                                                            width: `${percentage}%`, 
                                                            height: '100%',
                                                            background: `linear-gradient(90deg, ${colors[index % colors.length]} 0%, ${colors[index % colors.length]}dd 100%)`,
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-end',
                                                            paddingRight: '8px',
                                                            color: 'white',
                                                            fontWeight: '600',
                                                            fontSize: '12px',
                                                            transition: 'width 0.5s ease-in-out'
                                                        }}>
                                                            {stat.requestCount}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* Table */}
                                    <table className="items-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Code Produit</th>
                                                <th>Désignation</th>
                                                <th>Nb Demandes</th>
                                                <th>Qté Totale</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productStats.map((stat, index) => (
                                                <tr key={stat.productId}>
                                                    <td>{index + 1}</td>
                                                    <td style={{ fontWeight: '600' }}>{stat.code_Produit}</td>
                                                    <td>{stat.designation}</td>
                                                    <td>
                                                        <span style={{ 
                                                            padding: '4px 10px',
                                                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                                            borderRadius: '6px',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {stat.requestCount}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: '#065f46' }}>
                                                        {Number(stat.totalQuantity).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        )}
                        
                        {/* Processing Time Tab */}
                        {statsActiveTab === 'processing' && (
                            processingStats && processingStats.totalRequests > 0 ? (
                                <div style={{ 
                                    padding: '20px', 
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                    borderRadius: '12px',
                                    border: '1px solid #fcd34d'
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                                        <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#667eea' }}>{processingStats.totalRequests}</div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Total finalisées</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>{processingStats.averageHours}h</div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Moyenne</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b' }}>{processingStats.minHours}h</div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Min</div>
                                        </div>
                                        <div style={{ textAlign: 'center', padding: '15px', background: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ef4444' }}>{processingStats.maxHours}h</div>
                                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Max</div>
                                        </div>
                                    </div>
                                    
                                    {/* Distribution Chart */}
                                    <div style={{ marginTop: '20px' }}>
                                        <h5 style={{ marginBottom: '15px', color: '#92400e' }}>📊 Distribution par durée:</h5>
                                        {processingStats.requestsByHourRange.map((range) => {
                                            const maxCount = Math.max(...processingStats.requestsByHourRange.map(r => r.count));
                                            const percentage = (range.count / maxCount) * 100;
                                            return (
                                                <div key={range.range} style={{ marginBottom: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#78350f' }}>{range.range}</span>
                                                        <span style={{ fontSize: '14px', color: '#666' }}>{range.count} demandes</span>
                                                    </div>
                                                    <div style={{ height: '24px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                                                        <div style={{ 
                                                            width: `${percentage}%`, 
                                                            height: '100%',
                                                            background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
                                                            borderRadius: '6px',
                                                            transition: 'width 0.5s'
                                                        }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                    Aucune donnée disponible
                                </p>
                            )
                        )}
                        
                        <div className="modal-actions" style={{ marginTop: '20px' }}>
                            <button 
                                type="button" 
                                onClick={() => setShowStatsModal(false)}
                                className="btn-secondary"
                            >
                                Fermer
                            </button>
                        </div>
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
                                    <th>Produit lié</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedRequest.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>{item.productName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit}</td>
                                        <td>
                                            {item.productId ? (
                                                <span style={{ color: '#28a745' }}>
                                                    {item.productCode} - {item.productDesignation}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#999' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Workflow History */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '10px' }}>Historique:</h4>
                            
                            {/* Control Stage */}
                            {selectedRequest.controlBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>🔍 Contrôle:</strong> {selectedRequest.controlBy}
                                    {selectedRequest.controlDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.controlDate).toLocaleString()})</span>}
                                    {selectedRequest.controlReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.controlReason}</em></div>}
                                </div>
                            )}
                            
                            {/* Director Stage */}
                            {selectedRequest.directorBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>👔 Direction:</strong> {selectedRequest.directorBy}
                                    {selectedRequest.directorDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.directorDate).toLocaleString()})</span>}
                                    {selectedRequest.directorReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.directorReason}</em></div>}
                                </div>
                            )}
                            
                            {/* Economat Stage */}
                            {selectedRequest.economatBy && (
                                <div style={{ marginBottom: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
                                    <strong>📦 Économat:</strong> {selectedRequest.economatBy}
                                    {selectedRequest.economatDate && <span style={{ fontSize: '12px', color: '#666' }}> ({new Date(selectedRequest.economatDate).toLocaleString()})</span>}
                                    {selectedRequest.economatReason && <div style={{ fontSize: '13px', marginTop: '4px' }}><em>Motif: {selectedRequest.economatReason}</em></div>}
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            {(selectedRequest.status === 'Finalized' || selectedRequest.status === 9) && (
                                <button 
                                    type="button" 
                                    onClick={() => handleDownloadPdf(selectedRequest)}
                                    className="btn-pdf"
                                    style={{ marginRight: '10px' }}
                                >
                                    📄 Télécharger PDF
                                </button>
                            )}
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

export default EconomatDashboard;