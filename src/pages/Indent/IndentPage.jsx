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
    const [indentRows, setIndentRows] = useState([]);
    const [selectedIndentRow, setSelectedIndentRow] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(24);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDrugs();
        setupRealtimeSubscription();
    }, []);

    // Reset to first page when search query changes or indent source changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedIndentRow]);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            setDrugs(data || []);

            // Extract unique indent rows
            const uniqueRows = [...new Set(data.map(d => d.row).filter(Boolean))].sort();
            setIndentRows(uniqueRows);
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

        // Filter by indent row
        if (selectedIndentRow !== 'ALL') {
            result = result.filter(drug => drug.row === selectedIndentRow);
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
    }, [searchQuery, selectedIndentRow, drugs]);

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
                <Tag style={{ fontSize: '14px' }} color={getPuchaseTypeColor(type)}>
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
                <Tag style={{ fontSize: '14px' }} color={getStdKtColor(type)}>
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
                <Tag style={{ fontSize: '14px' }} color={getSourceColor(source)}>
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
                        placeholder="Filter by Row"
                        style={{ width: 180 }}
                        size="large"
                        allowClear
                        value={selectedIndentRow === 'ALL' ? null : selectedIndentRow}
                        onChange={(value) => setSelectedIndentRow(value || 'ALL')}
                    >
                        {indentRows.map(row => (
                            <Select.Option key={row} value={row}>
                                {row}
                            </Select.Option>
                        ))}
                    </Select>
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
                {!loading && filteredDrugs.length > 0 && (
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

