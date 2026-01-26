import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    Form,
    Input,
    InputNumber,
    Select,
    Radio,
    Space,
    Typography,
    Tag,
    Button,
    message,
    Descriptions,
    Checkbox,
    DatePicker,
    Row,
    Col,
} from 'antd';
import { EnvironmentOutlined, EditOutlined, FormOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { getTypeColor } from '../../lib/colorMappings';
import { getSourceColor } from '../../lib/colorMappings';
import dayjs from 'dayjs';
import CustomDateInput from '../../components/CustomDateInput';

const { Title, Text } = Typography;
const { TextArea } = Input;

const IndentModal = ({ drug, visible, onClose, onSuccess, onDrugUpdate }) => {
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [minQty, setMinQty] = useState(null);
    const [maxQty, setMaxQty] = useState(null);
    const [indentSource, setIndentSource] = useState(null);
    const [isShortExp, setIsShortExp] = useState(false);
    const [shortExp, setShortExp] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const quantityInputRef = useRef(null);
    const debounceRef = useRef(null);
    const [isIndentSourceDropdownOpen, setIsIndentSourceDropdownOpen] = useState(false);

    // Initialize state when drug changes
    useEffect(() => {
        if (drug) {
            setMinQty(drug.min_qty);
            setMaxQty(drug.max_qty);
            setIndentSource(drug.indent_source);
            setIsShortExp(drug.is_short_exp || false);
            setShortExp(drug.short_exp ? dayjs(drug.short_exp) : null);
            setHasChanges(false);
        }
    }, [drug]);

    // Auto-focus quantity input when modal opens
    useEffect(() => {
        if (visible) {
            // Delay to ensure modal animation completes
            setTimeout(() => {
                if (quantityInputRef.current) {
                    quantityInputRef.current.focus();
                }
            }, 400);
        }
    }, [visible]);





    const handleMinQtyChange = (e) => {
        const value = e && e.target ? e.target.value : e;
        setMinQty(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setHasChanges(true);
        }, 500);
    };

    const handleMaxQtyChange = (e) => {
        const value = e && e.target ? e.target.value : e;
        setMaxQty(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setHasChanges(true);
        }, 500);
    };

    const handleIndentSourceChange = (value) => {
        setIndentSource(value);
        setIsIndentSourceDropdownOpen(false);
        if (document.activeElement) {
            document.activeElement.blur();
        }
        setHasChanges(true);
    };

    const handleShortExpChange = (e) => {
        setIsShortExp(e.target.checked);
        setHasChanges(true);
    };

    const handleShortExpDateChange = (date) => {
        setShortExp(date);
        setHasChanges(true);
    };

    const saveQuickUpdates = async () => {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .update({
                    min_qty: minQty,
                    max_qty: maxQty,
                    indent_source: indentSource,
                    is_short_exp: isShortExp,
                    short_exp: shortExp ? shortExp.format('YYYY-MM-DD') : null,
                })
                .eq('id', drug.id);

            if (error) throw error;

            message.success('Item details updated');
            setHasChanges(false);
            onClose(true)
            if (onDrugUpdate) onDrugUpdate();
        } catch (error) {
            console.error('Error updating item details:', error);
            message.error('Failed to update item details');
            throw error;
        }
    };

    const handleClose = () => {
        // Just close without saving changes
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onClose(false);
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);



            const { error } = await supabase
                .from('indent_requests')
                .insert({
                    item_id: drug.id,
                    requested_qty: values.quantity,
                    status: 'Pending',
                });

            if (error) throw error;
            form.resetFields();
            onSuccess();
        } catch (error) {
            console.error('Error adding to cart:', error);
            if (!error.message?.includes('item details')) {
                message.error('Failed to add item to cart');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEditModal = () => {
        editForm.setFieldsValue(drug);
        setEditModalVisible(true);
    };

    const handleEditSubmit = async (values) => {
        try {
            const { error } = await supabase
                .from('inventory_items')
                .update(values)
                .eq('id', drug.id);

            if (error) throw error;

            message.success('Drug updated successfully');
            setEditModalVisible(false);
            editForm.resetFields();
            if (onDrugUpdate) onDrugUpdate();
        } catch (error) {
            console.error('Error updating drug:', error);
            message.error('Failed to update drug');
        }
    };

    // Handle Enter key shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.defaultPrevented) return;

            if (visible && !editModalVisible && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();

                if (hasChanges) {
                    saveQuickUpdates();
                } else {
                    form.submit();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [visible, editModalVisible, hasChanges, form, saveQuickUpdates]);

    if (!drug) return null;

    return (
        <>
            <Modal
                open={visible}
                onCancel={handleClose}
                destroyOnHidden
                zIndex={1000}
                centered
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
                        <span>Add to Indent Cart</span>
                        <Button
                            type="text"
                            icon={<FormOutlined />}
                            onClick={handleOpenEditModal}
                            size="small"
                        >
                            Edit
                        </Button>
                    </div>
                }
                footer={null}
                width={450}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {/* Drug Info */}
                    <div style={{ textAlign: 'center' }}>
                        <Title level={4} style={{ marginBottom: 8 }}>
                            {drug.name}
                        </Title>
                        <Space>
                            <Tag color={getSourceColor(drug.indent_source)}>{drug.indent_source}</Tag>
                            <Space size="small">
                                <EnvironmentOutlined style={{ color: '#1890ff' }} />
                                <Text type="secondary">{drug.location_code}</Text>
                            </Space>
                        </Space>
                        {drug.remarks && (
                            <div style={{ marginTop: 8 }}>
                                <Text style={{ fontSize: '14px' }}>
                                    {drug.remarks}
                                </Text>
                            </div>
                        )}
                    </div>

                    {/* Editable Stock Info */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {hasChanges && (
                                <Text type="warning" style={{ fontSize: 12 }}>
                                    (unsaved changes)
                                </Text>
                            )}
                        </div>
                        <Row gutter={[16, 16]} justify="center">
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Min Qty
                                </Text>
                                <Input
                                    value={minQty}
                                    onChange={handleMinQtyChange}
                                    placeholder="Min"
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col xs={12} sm={6}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Max Qty
                                </Text>
                                <Input
                                    value={maxQty}
                                    onChange={handleMaxQtyChange}
                                    placeholder="Max"
                                    style={{ width: '100%' }}
                                />
                            </Col>
                        </Row>
                        <Row gutter={[16, 16]} justify="center">

                            <Col xs={24} sm={12}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Indent From
                                </Text>
                                <Select
                                    value={indentSource}
                                    onChange={handleIndentSourceChange}
                                    style={{ width: '100%' }}
                                    placeholder="Select"
                                    size="middle"
                                    virtual={false}
                                    showSearch={false}
                                    open={isIndentSourceDropdownOpen}
                                    onDropdownVisibleChange={(visible) => setIsIndentSourceDropdownOpen(visible)}
                                >
                                    <Select.Option value="OPD Counter">OPD Counter</Select.Option>
                                    <Select.Option value="OPD Substore">OPD Substore</Select.Option>
                                    <Select.Option value="IPD Counter">IPD Counter</Select.Option>
                                    <Select.Option value="MNF Substor">MNF Substor</Select.Option>
                                    <Select.Option value="Manufact">Manufact</Select.Option>
                                    <Select.Option value="Prepacking">Prepacking</Select.Option>
                                    <Select.Option value="IPD Substore">IPD Substore</Select.Option>
                                </Select>
                            </Col>
                        </Row>
                        <Row gutter={[16, 16]} justify="center">
                            <Col xs={24} sm={12}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                    Short Exp?
                                </Text>
                                <Space
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Checkbox
                                        checked={isShortExp}
                                        onChange={handleShortExpChange}
                                    />
                                    {isShortExp && (
                                        <CustomDateInput
                                            value={shortExp}
                                            onChange={handleShortExpDateChange}
                                            placeholder="DDMMYY"
                                        />
                                    )}
                                </Space>

                            </Col>
                        </Row>
                    </div>

                    {/* Form */}
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        initialValues={{
                            quantity: '',
                        }}
                    >
                        <Form.Item
                            name="quantity"
                            label="Indent Quantity"
                            rules={[
                                { required: true, message: 'Please enter indent quantity' },
                            ]}
                        >
                            <Input
                                ref={quantityInputRef}
                                autoFocus
                                style={{ width: '100%' }}
                                placeholder="e.g., 10 bot, 5x30's, 2 carton"
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                                {hasChanges && (
                                    <Button
                                        onClick={saveQuickUpdates}
                                        loading={loading}
                                        type="default"
                                        style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                    >
                                        Save Changes
                                    </Button>
                                )}
                                <Button onClick={handleClose}>Cancel</Button>
                                <Button type="primary" htmlType="submit" loading={loading}>
                                    Add to Cart
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Space>
            </Modal>

            {/* Edit Drug Modal */}
            <Modal
                title="Edit Drug Details"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                onOk={() => editForm.submit()}
                width={600}
                zIndex={2000}
                centered
            >
                <Form
                    form={editForm}
                    layout="vertical"
                    onFinish={handleEditSubmit}
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
                        <Select placeholder="Select drug type" virtual={false}>
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
                            <Input placeholder="e.g., 10 bot" style={{ width: 120 }} />
                        </Form.Item>

                        <Form.Item name="max_qty" label="Max Quantity">
                            <Input placeholder="e.g., 50 bot" style={{ width: 120 }} />
                        </Form.Item>
                    </Space>

                    <Form.Item name="indent_source" label="Indent Source">
                        <Select placeholder="Select source" virtual={false}>
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
        </>
    );
};

export default IndentModal;
