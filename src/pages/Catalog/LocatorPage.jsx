import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Input,
    Row,
    Col,
    Skeleton,
    Empty,
    Space,
    Button,
    List,
    Typography,
    Tag,
    message,
    Pagination,
} from 'antd';
import {
    SearchOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { getTypeColor, getSourceColor } from '../../lib/colorMappings';
import DrugCard from '../../components/DrugCard';
import DrugDetailModal from './DrugDetailModal';
import DebouncedSearchInput from '../../components/DebouncedSearchInput';

const { Title, Text } = Typography;

const LocatorPage = () => {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(24);

    useEffect(() => {
        fetchDrugs();
    }, []);

    const handleSearch = useCallback((value) => {
        setSearchQuery(value);
        setCurrentPage(1); // Reset to first page on new search
    }, []);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            const sortOrder = [
                'OPD',
                'Eye/Ear/Nose/Inh',
                'DDA',
                'External',
                'Injection',
                'Syrup',
                'Others',
                'UOD'
            ];

            const sortedData = (data || []).sort((a, b) => {
                const typeA = a.type || '';
                const typeB = b.type || '';

                const indexA = sortOrder.indexOf(typeA);
                const indexB = sortOrder.indexOf(typeB);

                // If both types are in our list, sort by index
                if (indexA !== -1 && indexB !== -1) {
                    if (indexA !== indexB) return indexA - indexB;
                    // If same type, sort by name
                    return a.name.localeCompare(b.name);
                }

                // If only one is in the list, put it first
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;

                // If neither are in the list, sort by type then name
                if (typeA !== typeB) return typeA.localeCompare(typeB);
                return a.name.localeCompare(b.name);
            });

            setDrugs(sortedData);
        } catch (error) {
            console.error('Error fetching drugs:', error);
            message.error('Failed to load inventory items');
        } finally {
            setLoading(false);
        }
    };

    // Memoize filtered drugs to prevent unnecessary recalculations
    const filteredDrugs = useMemo(() => {
        if (!searchQuery.trim()) {
            return drugs;
        }

        const query = searchQuery.toLowerCase();
        return drugs.filter(
            (drug) =>
                drug.name.toLowerCase().includes(query) ||
                drug.type?.toLowerCase().includes(query) ||
                drug.location_code?.toLowerCase().includes(query) ||
                drug.remarks?.toLowerCase().includes(query)
        );
    }, [searchQuery, drugs]);

    // Memoize paginated drugs for grid view
    const paginatedDrugs = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredDrugs.slice(startIndex, endIndex);
    }, [filteredDrugs, currentPage, pageSize]);

    // Use useCallback to prevent unnecessary re-renders
    const handleDrugClick = useCallback((drug) => {
        setSelectedDrug(drug);
        setModalVisible(true);
    }, []);

    const handlePageChange = useCallback((page, newPageSize) => {
        setCurrentPage(page);
        if (newPageSize !== pageSize) {
            setPageSize(newPageSize);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [pageSize]);

    return (
        <div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* Header */}
                <div>
                    <Title level={3}>Katalog Farmasi ED</Title>
                    <Text type="secondary">
                        Search for drug locations in Farmasi ED
                    </Text>
                </div>

                {/* Search and View Toggle */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <DebouncedSearchInput
                        placeholder="Search by name, type, location, or remarks..."
                        prefix={<SearchOutlined />}
                        onSearch={handleSearch}
                        style={{ flex: '1 1 300px', minWidth: '200px' }}
                        allowClear
                    />
                    <Space>
                        <Button
                            type={viewMode === 'grid' ? 'primary' : 'default'}
                            icon={<AppstoreOutlined />}
                            onClick={() => setViewMode('grid')}
                        />
                        <Button
                            type={viewMode === 'list' ? 'primary' : 'default'}
                            icon={<UnorderedListOutlined />}
                            onClick={() => setViewMode('list')}
                        />
                    </Space>
                </div>

                {/* Results Count */}
                {!loading && (
                    <Text type="secondary">
                        {filteredDrugs.length} {filteredDrugs.length === 1 ? 'item' : 'items'} found
                    </Text>
                )}

                {/* Loading State */}
                {loading && (
                    <Row gutter={[16, 16]}>
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={i}>
                                <Skeleton active />
                            </Col>
                        ))}
                    </Row>
                )}

                {/* Empty State */}
                {!loading && filteredDrugs.length === 0 && (
                    <Empty
                        description={
                            searchQuery
                                ? 'No drugs found matching your search'
                                : 'No drugs in inventory'
                        }
                    />
                )}

                {/* Grid View */}
                {!loading && filteredDrugs.length > 0 && viewMode === 'grid' && (
                    <>
                        <Row gutter={[16, 16]}>
                            {paginatedDrugs.map((drug) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={drug.id}>
                                    <DrugCard drug={drug} onClick={() => handleDrugClick(drug)} />
                                </Col>
                            ))}
                        </Row>
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                current={currentPage}
                                total={filteredDrugs.length}
                                pageSize={pageSize}
                                onChange={handlePageChange}
                                onShowSizeChange={handlePageChange}
                                showSizeChanger
                                showTotal={(total) => `Total ${total} items`}
                                pageSizeOptions={['12', '24', '48', '96']}
                            />
                        </div>
                    </>
                )}

                {/* List View */}
                {!loading && filteredDrugs.length > 0 && viewMode === 'list' && (
                    <List
                        grid={{
                            gutter: 16,
                            xs: 1,
                            sm: 1,
                            md: 2,
                            lg: 2,
                            xl: 3,
                            xxl: 3,
                        }}
                        dataSource={filteredDrugs}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: filteredDrugs.length,
                            onChange: handlePageChange,
                            onShowSizeChange: handlePageChange,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} items`,
                            pageSizeOptions: ['12', '24', '48', '96'],
                        }}
                        renderItem={(drug) => (
                            <List.Item style={{ marginBottom: 8 }}>
                                <div
                                    style={{
                                        cursor: 'pointer',
                                        padding: '12px',
                                        border: '1px solid #f0f0f0',
                                        borderRadius: '8px',
                                        transition: 'all 0.3s',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                    onClick={() => handleDrugClick(drug)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#1890ff';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = '#f0f0f0';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Text strong style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                                                {drug.name}
                                            </Text>
                                            <Space wrap size={[4, 4]} style={{ marginBottom: '8px' }}>
                                                <Tag color={getTypeColor(drug.type)} style={{ margin: 0, fontSize: '11px' }}>
                                                    {drug.type}
                                                </Tag>
                                            </Space>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <EnvironmentOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                                                <Text strong style={{ fontSize: '12px' }}>
                                                    {drug.location_code}
                                                </Text>
                                            </div>
                                            {drug.remarks && (
                                                <Text
                                                    type="secondary"
                                                    style={{
                                                        fontSize: '11px',
                                                        display: 'block',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                    title={drug.remarks}
                                                >
                                                    {drug.remarks}
                                                </Text>
                                            )}
                                        </div>
                                        {drug.image_url && (
                                            <img
                                                width={60}
                                                height={60}
                                                alt={drug.name}
                                                src={drug.image_url}
                                                style={{
                                                    borderRadius: 4,
                                                    objectFit: 'contain',
                                                    backgroundColor: '#f5f5f5',
                                                    flexShrink: 0
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
            </Space>

            {/* Drug Detail Modal */}
            <DrugDetailModal
                drug={selectedDrug}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </div>
    );
};

export default LocatorPage;
