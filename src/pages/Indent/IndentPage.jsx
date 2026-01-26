import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Row,
    Col,
    Skeleton,
    Empty,
    Space,
    Button,
    Typography,
    message,
    Pagination,
    Input,
    List,
    Tag,
    Select,
    Table,
} from 'antd';
import {
    SearchOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    EnvironmentOutlined,
    TableOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { getTypeColor, getSourceColor } from '../../lib/colorMappings';
import DrugCard from '../../components/DrugCard2';
import IndentModal from './IndentModal';
import DebouncedSearchInput from '../../components/DebouncedSearchInput';

const { Title, Text } = Typography;

const IndentPage = () => {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState('ALL'); // 'ALL' or a specific section
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [sections, setSections] = useState([]);
    const [indentSources, setIndentSources] = useState([]);
    const [selectedIndentSource, setSelectedIndentSource] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(24);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'grid' or 'list' or 'table'

    useEffect(() => {
        fetchDrugs();
        setupRealtimeSubscription();
    }, []);

    // Reset to first page when section changes or search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSection, searchQuery, selectedIndentSource]);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*');

            if (error) throw error;

            if (data) {
                data.sort((a, b) => {
                    // Handle null/undefined values
                    if (!a.section || !b.section) return 0;
                    if (!a.row || !b.row) return 0;
                    if (!a.bin || !b.bin) return 0;

                    // 1️⃣ Natural sort for section
                    const secA = a.section.replace(/[0-9]/g, '');
                    const secB = b.section.replace(/[0-9]/g, '');
                    if (secA !== secB) return secA.localeCompare(secB);

                    const secNumA = parseInt(a.section.replace(/[^0-9]/g, '')) || 0;
                    const secNumB = parseInt(b.section.replace(/[^0-9]/g, '')) || 0;
                    if (secNumA !== secNumB) return secNumA - secNumB;

                    // 2️⃣ Natural sort for row
                    const rowA = a.row.toString().replace(/[A-Za-z]/g, '');
                    const rowB = b.row.toString().replace(/[A-Za-z]/g, '');
                    if (!isNaN(rowA) && !isNaN(rowB) && rowA !== rowB) {
                        return Number(rowA) - Number(rowB);
                    }

                    // 3️⃣ Natural sort for bin (M1, M2, M10)
                    const binPrefixA = a.bin.replace(/[0-9]/g, '');
                    const binPrefixB = b.bin.replace(/[0-9]/g, '');
                    if (binPrefixA !== binPrefixB) return binPrefixA.localeCompare(binPrefixB);

                    const binNumA = parseInt(a.bin.replace(/[^0-9]/g, ''));
                    const binNumB = parseInt(b.bin.replace(/[^0-9]/g, ''));
                    return binNumA - binNumB;
                });
            }


            setDrugs(data || []);

            // Extract unique sections
            const uniqueSections = [...new Set(data.map(d => d.section))].sort();
            setSections(uniqueSections);

            // Extract unique indent sources
            const uniqueSources = [...new Set(data.map(d => d.indent_source).filter(Boolean))].sort();
            setIndentSources(uniqueSources);
        } catch (error) {
            console.error('Error fetching drugs:', error);
            message.error('Failed to load inventory items');
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        const subscription = supabase
            .channel('inventory_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory_items',
                },
                (payload) => {
                    console.log('Realtime update:', payload);
                    fetchDrugs(); // Refresh data on any change
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    // Memoize filtered drugs to prevent unnecessary recalculations
    const filteredDrugs = useMemo(() => {
        let result = drugs;

        // Filter by section
        if (selectedSection !== 'ALL') {
            result = result.filter(drug => drug.section === selectedSection);
        }

        // Filter by indent source
        if (selectedIndentSource !== 'ALL') {
            result = result.filter(drug => drug.indent_source === selectedIndentSource);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(drug =>
                drug.name?.toLowerCase().includes(query) ||
                drug.generic_name?.toLowerCase().includes(query) ||
                drug.location_code?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [selectedSection, searchQuery, selectedIndentSource, drugs]);

    // Memoize paginated drugs
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

    const handleIndentSuccess = useCallback(() => {
        setModalVisible(false);
        message.success('Item added to cart successfully!');
    }, []);

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            width: 500,
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>{record.generic_name}</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 120,
            filters: [
                { text: 'OPD', value: 'OPD' },
                { text: 'Eye/Ear/Nose/Inh', value: 'Eye/Ear/Nose/Inh' },
                { text: 'DDA', value: 'DDA' },
                { text: 'External', value: 'External' },
                { text: 'Injection', value: 'Injection' },
                { text: 'Syrup', value: 'Syrup' },
                { text: 'Others', value: 'Others' },
                { text: 'UOD', value: 'UOD' },
            ],
            onFilter: (value, record) => record.type === value,
            render: (type) => (
                <Tag color={getTypeColor(type)}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Location',
            dataIndex: 'location_code',
            key: 'location_code',
            sorter: (a, b) => a.location_code.localeCompare(b.location_code),
            width: 120,
            render: (text) => (
                <Space size={4}>
                    <EnvironmentOutlined style={{ color: '#1890ff' }} />
                    {text}
                </Space>
            ),
        },
        {
            title: 'Min',
            dataIndex: 'min_qty',
            key: 'min_qty',
            width: 120,
            responsive: ['md'],
            align: 'center',
        },
        {
            title: 'Max',
            dataIndex: 'max_qty',
            key: 'max_qty',
            width: 120,
            responsive: ['md'],
            align: 'center',
        },
        {
            title: 'Source',
            dataIndex: 'indent_source',
            key: 'indent_source',
            width: 120,
            render: (source) => source && (
                <Tag color={getSourceColor(source)}>
                    {source}
                </Tag>
            ),
        },
        {
            title: 'Remarks',
            dataIndex: 'remarks',
            key: 'remarks',
            ellipsis: true,
            render: (text) => (
                <Text style={{ fontSize: '14px' }}>{text}</Text>
            ),
        },
    ];

    return (
        <div>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {/* Header */}
                <div>
                    <Title level={3}>Indent Management</Title>
                    <Text type="secondary">
                        Select items to add to your indent cart
                    </Text>
                </div>

                {/* Section Filter */}
                <Space wrap>
                    <Button
                        type={selectedSection === 'ALL' ? 'primary' : 'default'}
                        onClick={() => setSelectedSection('ALL')}
                    >
                        All Sections
                    </Button>
                    {sections.map(section => (
                        <Button
                            key={section}
                            type={selectedSection === section ? 'primary' : 'default'}
                            onClick={() => setSelectedSection(section)}
                        >
                            Section {section}
                        </Button>
                    ))}
                </Space>

                {/* Search Bar and View Toggle */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <DebouncedSearchInput
                        placeholder="Search by name, generic name, or location..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        onSearch={setSearchQuery}
                        allowClear
                        size="large"
                        style={{ flex: '1 1 300px', minWidth: '200px' }}
                    />
                    <Select
                        placeholder="Filter by Source"
                        style={{ width: 180 }}
                        size="large"
                        allowClear
                        value={selectedIndentSource === 'ALL' ? null : selectedIndentSource}
                        onChange={(value) => setSelectedIndentSource(value || 'ALL')}
                    >
                        {indentSources.map(source => (
                            <Select.Option key={source} value={source}>
                                {source}
                            </Select.Option>
                        ))}
                    </Select>
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
                        <Button
                            type={viewMode === 'table' ? 'primary' : 'default'}
                            icon={<TableOutlined />}
                            onClick={() => setViewMode('table')}
                        />
                    </Space>
                </div>

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
                    <Empty description="No drugs in this section" />
                )}

                {/* Table View */}
                {!loading && filteredDrugs.length > 0 && viewMode === 'table' && (
                    <Table
                        columns={columns}
                        dataSource={filteredDrugs}
                        rowKey="id"
                        showSorterTooltip={false}
                        pagination={{
                            current: currentPage,
                            pageSize: pageSize,
                            total: filteredDrugs.length,
                            onChange: handlePageChange,
                            showSizeChanger: true,
                            showTotal: (total) => `Total ${total} items`,
                            pageSizeOptions: ['12', '24', '48', '96'],
                        }}
                        onRow={(record) => ({
                            onClick: () => handleDrugClick(record),
                            style: { cursor: 'pointer' },
                        })}
                        scroll={{ x: 1000 }}
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
                                                {drug.indent_source && (
                                                    <Tag color={getSourceColor(drug.indent_source)} style={{ margin: 0, fontSize: '11px' }}>
                                                        {drug.indent_source}
                                                    </Tag>
                                                )}
                                            </Space>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <EnvironmentOutlined style={{ color: '#1890ff', fontSize: '12px' }} />
                                                <Text strong style={{ fontSize: '12px' }}>
                                                    {drug.location_code}
                                                </Text>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                    Min: <Text strong style={{ fontSize: '11px' }}>{drug.min_qty || 'N/A'}</Text>
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                    Max: <Text strong style={{ fontSize: '11px' }}>{drug.max_qty || 'N/A'}</Text>
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

            {/* Indent Modal */}
            <IndentModal
                drug={selectedDrug}
                visible={modalVisible}
                onClose={(shouldRefresh) => {
                    setModalVisible(false);
                    if (shouldRefresh) {
                        fetchDrugs();
                    }
                }}
                onSuccess={handleIndentSuccess}
                onDrugUpdate={fetchDrugs}
            />
        </div>
    );
};

export default IndentPage;

