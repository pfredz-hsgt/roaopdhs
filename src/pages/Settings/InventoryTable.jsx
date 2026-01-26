import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Modal,
    Form,
    Input,
    Select,
    InputNumber,
    Space,
    message,
    Popconfirm,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';

const { TextArea } = Input;

const InventoryTable = () => {
    const [drugs, setDrugs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingDrug, setEditingDrug] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [form] = Form.useForm();

    useEffect(() => {
        fetchDrugs();
        setupRealtimeSubscription();
    }, []);

    const fetchDrugs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            setDrugs(data || []);
        } catch (error) {
            console.error('Error fetching drugs:', error);
            message.error('Failed to load inventory items');
        } finally {
            setLoading(false);
        }
    };

    const setupRealtimeSubscription = () => {
        const subscription = supabase
            .channel('inventory_table_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'inventory_items',
                },
                () => {
                    fetchDrugs();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    };

    const handleAdd = () => {
        setEditingDrug(null);
        form.resetFields();
        setModalVisible(true);
    };

    const handleEdit = (drug) => {
        setEditingDrug(drug);
        form.setFieldsValue(drug);
        setModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .delete()
                .eq('id', id);

            if (error) throw error;

            message.success('Drug deleted successfully');
            fetchDrugs();
        } catch (error) {
            console.error('Error deleting drug:', error);
            message.error('Failed to delete drug');
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingDrug) {
                // Update existing drug
                const { error } = await supabase
                    .from('inventory_items')
                    .update(values)
                    .eq('id', editingDrug.id);

                if (error) throw error;

                message.success('Drug updated successfully');
            } else {
                // Insert new drug
                const { error } = await supabase
                    .from('inventory_items')
                    .insert(values);

                if (error) throw error;

                message.success('Drug added successfully');
            }

            setModalVisible(false);
            form.resetFields();
            fetchDrugs();
        } catch (error) {
            console.error('Error saving drug:', error);
            message.error('Failed to save drug');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            width: 200,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            filters: [
                { text: 'OPD', value: 'OPD' },
                { text: 'Eye/Ear/Nose/Inh', value: 'Eye/Ear/Nose/Inh' },
                { text: 'DDA', value: 'DDA' },
                { text: 'External', value: 'External' },
                { text: 'Injection', value: 'Injection' },
                { text: 'Syrup', value: 'Syrup' },
                { text: 'Others', value: 'Others' },
                { text: 'UOD', value: 'UOD' },
                { text: 'Non-Drug', value: 'Non-Drug' },
            ],
            onFilter: (value, record) => record.type === value,
            width: 120,
        },
        {
            title: 'Location',
            dataIndex: 'location_code',
            key: 'location_code',
            sorter: (a, b) => a.location_code.localeCompare(b.location_code),
            width: 120,
        },
        {
            title: 'Min Qty',
            dataIndex: 'min_qty',
            key: 'min_qty',
            width: 80,
        },
        {
            title: 'Max Qty',
            dataIndex: 'max_qty',
            key: 'max_qty',
            width: 80,
        },
        {
            title: 'Source',
            dataIndex: 'indent_source',
            key: 'indent_source',
            filters: [
                { text: 'OPD Counter', value: 'OPD Counter' },
                { text: 'OPD Substore', value: 'OPD Substore' },
                { text: 'IPD Counter', value: 'IPD Counter' },
                { text: 'MNF Substor', value: 'MNF Substor' },
                { text: 'Manufact', value: 'Manufact' },
                { text: 'Prepacking', value: 'Prepacking' },
                { text: 'IPD Substore', value: 'IPD Substore' },
            ],
            onFilter: (value, record) => record.indent_source === value,
            width: 80,
        },
        {
            title: 'Remarks',
            dataIndex: 'remarks',
            key: 'remarks',
            ellipsis: true,
            width: 200,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            align: 'center',
            render: (_, record) => (
                <Popconfirm
                    title="Delete this drug?"
                    onConfirm={(e) => {
                        e.stopPropagation();
                        handleDelete(record.id);
                    }}
                    okText="Yes"
                    cancelText="No"
                    onCancel={(e) => e.stopPropagation()}
                >
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => e.stopPropagation()}
                    />
                </Popconfirm>
            ),
        },
    ];

    // Filter drugs based on search query
    const filteredDrugs = drugs.filter((drug) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            drug.name?.toLowerCase().includes(query) ||
            drug.type?.toLowerCase().includes(query) ||
            drug.location_code?.toLowerCase().includes(query) ||
            drug.remarks?.toLowerCase().includes(query)
        );
    });

    // Handle Enter key for modal submission
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!modalVisible) return;

            // Allow Enter in TextArea to function normally (new line)
            if (e.target.tagName.toLowerCase() === 'textarea') return;

            if (e.key === 'Enter') {
                e.preventDefault();
                form.submit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [modalVisible, form]);

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                    placeholder="Search by name, type, location, or remarks..."
                    prefix={<SearchOutlined />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: '1 1 300px', maxWidth: '500px' }}
                    allowClear
                />
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                    Add New Drug
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={filteredDrugs}
                showSorterTooltip={false}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1200 }}
                onRow={(record) => ({
                    onClick: () => handleEdit(record),
                    style: { cursor: 'pointer' },
                })}
                pagination={{
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} items`,
                }}
            />

            <Modal
                title={editingDrug ? 'Edit Drug' : 'Add New Drug'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Drug Name"
                        rules={[{ required: true, message: 'Please enter drug name' }]}
                    >
                        <Input placeholder="e.g., Paracetamol 500mg" />
                    </Form.Item>

                    <Form.Item
                        name="type"
                        label="Type"
                        rules={[{ required: true, message: 'Please select type' }]}
                    >
                        <Select placeholder="Select drug type">
                            <Select.Option value="OPD">OPD</Select.Option>
                            <Select.Option value="Eye/Ear/Nose/Inh">Eye/Ear/Nose/Inh</Select.Option>
                            <Select.Option value="DDA">DDA</Select.Option>
                            <Select.Option value="External">External</Select.Option>
                            <Select.Option value="Injection">Injection</Select.Option>
                            <Select.Option value="Syrup">Syrup</Select.Option>
                            <Select.Option value="Others">Others</Select.Option>
                            <Select.Option value="UOD">UOD</Select.Option>
                            <Select.Option value="Non-Drug">Non-Drug</Select.Option>
                        </Select>
                    </Form.Item>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item
                            name="section"
                            label="Section"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="e.g., F" style={{ width: 100 }} />
                        </Form.Item>

                        <Form.Item
                            name="row"
                            label="Row"
                            rules={[{ required: true, message: 'Required' }]}
                        >
                            <Input placeholder="e.g., 1" style={{ width: 100 }} />
                        </Form.Item>

                        <Form.Item
                            name="bin"
                            label="Bin"
                            rules={[{ required: false, message: 'Required' }]}
                        >
                            <Input placeholder="e.g., 1" style={{ width: 100 }} />
                        </Form.Item>
                    </Space>

                    <Space style={{ width: '100%' }} size="large">
                        <Form.Item name="min_qty" label="Min Quantity">
                            <Input placeholder="Min Qty" style={{ width: 120 }} />
                        </Form.Item>

                        <Form.Item name="max_qty" label="Max Quantity">
                            <Input placeholder="Max Qty" style={{ width: 120 }} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="indent_source" label="Indent Source">
                        <Select placeholder="Select source">
                            <Select.Option value="OPD Counter">OPD Counter</Select.Option>
                            <Select.Option value="OPD Substore">OPD Substore</Select.Option>
                            <Select.Option value="IPD Counter">IPD Counter</Select.Option>
                            <Select.Option value="MNF Substor">MNF Substor</Select.Option>
                            <Select.Option value="Manufact">Manufact</Select.Option>
                            <Select.Option value="Prepacking">Prepacking</Select.Option>
                            <Select.Option value="IPD Substore">IPD Substore</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="remarks" label="Remarks">
                        <TextArea
                            rows={3}
                            placeholder="Any special notes or instructions..."
                        />
                    </Form.Item>

                    <Form.Item name="image_url" label="Image URL">
                        <Input placeholder="https://..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default InventoryTable;
