import React from 'react';
import { Card, Tag, Typography } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { getTypeColor, getSourceColor } from '../lib/colorMappings';

const { Text } = Typography;

const DrugCard = ({ drug, onClick }) => {

    return (
        <Card
            hoverable
            onClick={onClick}
            cover={
                drug.image_url ? (
                    <img
                        alt={drug.name}
                        src={drug.image_url}
                        style={{ height: 200, objectFit: 'contain', backgroundColor: '#f5f5f5' }}
                    />
                ) : (
                    <div
                        style={{
                            height: 200,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '48px',
                            fontWeight: 'bold',
                        }}
                    >
                        {drug.location_code}
                    </div>
                )
            }
            style={{ marginBottom: 16 }}
        >
            <Card.Meta
                title={<Text strong>{drug.name}</Text>}
                description={
                    <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 8 }}>
                            <Tag color={getTypeColor(drug.type)}>{drug.type}</Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <EnvironmentOutlined style={{ color: '#1890ff' }} />
                            <Text type="secondary">{drug.location_code}</Text>
                        </div>
                        {drug.remarks && (
                            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                                {drug.remarks}
                            </Text>
                        )}
                    </div>
                }
            />
        </Card>
    );
};

export default DrugCard;
