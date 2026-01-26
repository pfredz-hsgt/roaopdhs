import React from 'react';
import { Modal, Descriptions, Tag, Typography, Space, Image } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { getTypeColor, getSourceColor } from '../../lib/colorMappings';

const { Title, Text } = Typography;

const DrugDetailModal = ({ drug, visible, onClose }) => {
    if (!drug) return null;

    return (
        <Modal
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            centered
        >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                    <Title level={3} style={{ marginBottom: 8 }}>
                        {drug.name}
                    </Title>
                    <Space>
                        <Tag color={getTypeColor(drug.type)}>{drug.type}</Tag>
                        {drug.indent_source && (
                            <Tag color={getSourceColor(drug.indent_source)}>
                                {drug.indent_source}
                            </Tag>
                        )}
                    </Space>
                </div>

                {/* Image */}
                <div style={{ textAlign: 'center' }}>
                    {drug.image_url ? (
                        <Image
                            src={drug.image_url}
                            alt={drug.name}
                            style={{ maxHeight: 300, borderRadius: 8 }}
                            fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='48' fill='%23999'%3E{drug.name.charAt(0)}%3C/text%3E%3C/svg%3E"
                        />
                    ) : (
                        <div
                            style={{
                                height: 300,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '96px',
                                fontWeight: 'bold',
                                borderRadius: 8,
                            }}
                        >
                            {drug.location_code}
                        </div>
                    )}
                </div>

                {/* Details */}
                <Descriptions bordered column={1}>
                    <Descriptions.Item label={<><EnvironmentOutlined /> Location</>}>
                        <Text strong style={{ fontSize: '16px' }}>{drug.location_code}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Section: {drug.section} | Row: {drug.row} | Bin: {drug.bin}
                        </Text>
                    </Descriptions.Item>

                    {drug.min_qty !== null && (
                        <Descriptions.Item label="Minimum Quantity">
                            {drug.min_qty}
                        </Descriptions.Item>
                    )}

                    {drug.max_qty !== null && (
                        <Descriptions.Item label="Maximum Quantity">
                            {drug.max_qty}
                        </Descriptions.Item>
                    )}

                    {drug.remarks && (
                        <Descriptions.Item label="Remarks">
                            <Text>{drug.remarks}</Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Space>
        </Modal>
    );
};

export default DrugDetailModal;
