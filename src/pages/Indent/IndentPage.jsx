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
    TableOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { getSourceColor, getPuchaseTypeColor, getStdKtColor } from '../../lib/colorMappings';
import DrugCard from '../../components/DrugCard2';
import IndentModal from './IndentModal';
import DebouncedSearchInput from '../../components/DebouncedSearchInput';

const { Title, Text } = Typography;

const IndentPage = () => {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
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

    // Reset to first page when search query changes or indent source changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedIndentSource]);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            setDrugs(data || []);

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

        // Filter by indent source
        if (selectedIndentSource !== 'ALL') {
            result = result.filter(drug => drug.indent_source === selectedIndentSource);
        }

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(drug =>
                drug.name?.toLowerCase().includes(query) ||
                drug.item_code?.toLowerCase().includes(query) ||
                drug.pku?.toLowerCase().includes(query) ||
                drug.row?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [searchQuery, selectedIndentSource, drugs]);

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
            title: 'Item Code',
            dataIndex: 'item_code',
            key: 'item_code',
            width: 120,
            align: 'center',
            render: (text) => (
                <Text style={{ fontSize: '12px', color: '#cccccc' }}>{text}</Text>
            ),
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            width: 300,
        },
        {
            title: 'PKU',
            dataIndex: 'pku',
            key: 'pku',
            width: 120,
            align: 'center',
        },
        {
            title: 'Purchase Type',
            dataIndex: 'puchase_type',
            key: 'puchase_type',
            width: 120,
            align: 'center',
            filters: [
                { text: 'LP', value: 'LP' },
                { text: 'APPL', value: 'APPL' },
            ],
            onFilter: (value, record) => record.puchase_type === value,
            render: (type) => type && (
                <Tag color={getPuchaseTypeColor(type)}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'STD/KT',
            dataIndex: 'std_kt',
            key: 'std_kt',
            width: 100,
            align: 'center',
            filters: [
                { text: 'STD', value: 'STD' },
                { text: 'KT', value: 'KT' },
            ],
            onFilter: (value, record) => record.std_kt === value,
            render: (type) => type && (
                <Tag color={getStdKtColor(type)}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Row',
            dataIndex: 'row',
            key: 'row',
            width: 100,
            align: 'center',
        },
        {
            title: 'Max Qty',
            dataIndex: 'max_qty',
            key: 'max_qty',
            width: 100,
            responsive: ['md'],
            align: 'center',
        },
        {
            title: 'Balance',
            dataIndex: 'balance',
            key: 'balance',
            width: 100,
            responsive: ['md'],
            align: 'center',
        },
        {
            title: 'Source',
            dataIndex: 'indent_source',
            key: 'indent_source',
            width: 120,
            align: 'center',
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



                {/* Search Bar and View Toggle */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <DebouncedSearchInput
                        placeholder="Search by name, item code, PKU, or row..."
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
                                                {drug.puchase_type && (
                                                    <Tag color={getPuchaseTypeColor(drug.puchase_type)} style={{ margin: 0, fontSize: '11px' }}>
                                                        {drug.puchase_type}
                                                    </Tag>
                                                )}
                                                {drug.std_kt && (
                                                    <Tag color={getStdKtColor(drug.std_kt)} style={{ margin: 0, fontSize: '11px' }}>
                                                        {drug.std_kt}
                                                    </Tag>
                                                )}
                                                {drug.indent_source && (
                                                    <Tag color={getSourceColor(drug.indent_source)} style={{ margin: 0, fontSize: '11px' }}>
                                                        {drug.indent_source}
                                                    </Tag>
                                                )}
                                            </Space>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                {drug.item_code && (
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        Code: <Text strong style={{ fontSize: '11px' }}>{drug.item_code}</Text>
                                                    </Text>
                                                )}
                                                {drug.pku && (
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        PKU: <Text strong style={{ fontSize: '11px' }}>{drug.pku}</Text>
                                                    </Text>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                {drug.row && (
                                                    <Text type="secondary" style={{ fontSize: '11px' }}>
                                                        Row: <Text strong style={{ fontSize: '11px' }}>{drug.row}</Text>
                                                    </Text>
                                                )}
                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                    Max: <Text strong style={{ fontSize: '11px' }}>{drug.max_qty || 'N/A'}</Text>
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: '11px' }}>
                                                    Balance: <Text strong style={{ fontSize: '11px' }}>{drug.balance || 'N/A'}</Text>
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

