import React, { useState, useEffect } from 'react';
import {
    Upload,
    message,
    Typography,
    Space,
    Select,
    Card,
    List,
    Image,
    Button,
    Spin,
} from 'antd';
import { InboxOutlined, LinkOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';

const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

const ImageUploader = () => {
    const [drugs, setDrugs] = useState([]);
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);

    useEffect(() => {
        fetchDrugs();
    }, []);

    const fetchDrugs = async () => {
        try {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('id, name, image_url')
                .order('name', { ascending: true });

            if (error) throw error;

            setDrugs(data || []);
        } catch (error) {
            console.error('Error fetching drugs:', error);
            message.error('Failed to load drugs');
        }
    };

    const uploadProps = {
        name: 'file',
        multiple: false,
        accept: 'image/*',
        beforeUpload: async (file) => {
            if (!selectedDrug) {
                message.error('Please select a drug first');
                return false;
            }

            try {
                setUploading(true);

                // Generate unique filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${selectedDrug.id}-${Date.now()}.${fileExt}`;
                const filePath = `drug-images/${fileName}`;

                // Upload to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('drug-images')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('drug-images')
                    .getPublicUrl(filePath);

                const publicUrl = urlData.publicUrl;

                // Update inventory item with image URL
                const { error: updateError } = await supabase
                    .from('inventory_items')
                    .update({ image_url: publicUrl })
                    .eq('id', selectedDrug.id);

                if (updateError) throw updateError;

                message.success('Image uploaded successfully!');

                // Add to uploaded images list
                setUploadedImages(prev => [
                    { drug: selectedDrug.name, url: publicUrl },
                    ...prev,
                ]);

                // Refresh drugs list
                fetchDrugs();
                setSelectedDrug(null);
            } catch (error) {
                console.error('Error uploading image:', error);
                message.error('Failed to upload image: ' + error.message);
            } finally {
                setUploading(false);
            }

            return false; // Prevent default upload behavior
        },
    };

    return (
        <div>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <div>
                            <Title level={5}>Upload Drug Image</Title>
                            <Paragraph type="secondary">
                                Select a drug from the list below, then upload an image. The image will be stored
                                in Supabase Storage and linked to the drug automatically.
                            </Paragraph>
                        </div>

                        <div>
                            <Text strong>Select Drug:</Text>
                            <Select
                                showSearch
                                style={{ width: '100%', marginTop: 8 }}
                                placeholder="Search and select a drug..."
                                optionFilterProp="children"
                                value={selectedDrug?.id}
                                onChange={(value) => {
                                    const drug = drugs.find(d => d.id === value);
                                    setSelectedDrug(drug);
                                }}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={drugs.map(drug => ({
                                    value: drug.id,
                                    label: drug.name,
                                }))}
                            />
                            {selectedDrug && (
                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary">
                                        Selected: <Text strong>{selectedDrug.name}</Text>
                                    </Text>
                                    {selectedDrug.image_url && (
                                        <div style={{ marginTop: 8 }}>
                                            <Text type="warning">
                                                ⚠️ This drug already has an image. Uploading will replace it.
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <Dragger {...uploadProps} disabled={!selectedDrug || uploading}>
                            {uploading ? (
                                <div style={{ padding: '40px 0' }}>
                                    <Spin size="large" />
                                    <p style={{ marginTop: 16 }}>Uploading...</p>
                                </div>
                            ) : (
                                <>
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">
                                        Click or drag image to this area to upload
                                    </p>
                                    <p className="ant-upload-hint">
                                        Supports JPG, PNG, GIF. Maximum file size: 5MB
                                    </p>
                                </>
                            )}
                        </Dragger>
                    </Space>
                </Card>

                {uploadedImages.length > 0 && (
                    <Card title="Recently Uploaded Images">
                        <List
                            dataSource={uploadedImages}
                            renderItem={(item) => (
                                <List.Item
                                    extra={
                                        <Image
                                            width={100}
                                            src={item.url}
                                            alt={item.drug}
                                        />
                                    }
                                >
                                    <List.Item.Meta
                                        title={item.drug}
                                        description={
                                            <Space>
                                                <LinkOutlined />
                                                <a href={item.url} target="_blank" rel="noopener noreferrer">
                                                    View Image
                                                </a>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                <Card title="Setup Instructions" type="inner">
                    <Space direction="vertical">
                        <Text strong>Before uploading images, ensure Supabase Storage is configured:</Text>
                        <ol style={{ paddingLeft: 20 }}>
                            <li>Go to your Supabase project dashboard</li>
                            <li>Navigate to Storage section</li>
                            <li>Create a new bucket named: <Text code>drug-images</Text></li>
                            <li>Set the bucket to <Text strong>Public</Text></li>
                            <li>Configure CORS if needed for your domain</li>
                        </ol>
                    </Space>
                </Card>
            </Space>
        </div>
    );
};

export default ImageUploader;
