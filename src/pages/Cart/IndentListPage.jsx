import React, { useState, useEffect } from 'react';
import {
    Typography,
    Space,
    Collapse,
    List,
    Tag,
    Empty,
    Spin,
    message,
    DatePicker,
    Badge,
    Button,
    Checkbox,
} from 'antd';
import {
    EnvironmentOutlined,
    DownOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { getTypeColor, getSourceColor } from '../../lib/colorMappings';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const IndentListPage = () => {
    const [loading, setLoading] = useState(true);
    const [indentItems, setIndentItems] = useState([]);
    const [groupedItems, setGroupedItems] = useState({});
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [datesWithIndents, setDatesWithIndents] = useState([]);
    const [selectedSources, setSelectedSources] = useState([]);

    useEffect(() => {
        fetchDatesWithIndents();
    }, []);

    useEffect(() => {
        if (selectedDate) {
            fetchIndentItems();
        }
    }, [selectedDate]);

    useEffect(() => {
        groupItemsBySource();
    }, [indentItems]);

    const fetchDatesWithIndents = async () => {
        try {
            const { data, error } = await supabase
                .from('indent_requests')
                .select('created_at')
                .eq('status', 'Approved')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Extract unique dates
            const uniqueDates = [...new Set(
                data.map(item => dayjs(item.created_at).format('YYYY-MM-DD'))
            )];

            setDatesWithIndents(uniqueDates);
        } catch (error) {
            console.error('Error fetching dates:', error);
            message.error('Failed to load indent dates');
        }
    };

    const fetchIndentItems = async () => {
        try {
            setLoading(true);
            const startOfDay = selectedDate.startOf('day').toISOString();
            const endOfDay = selectedDate.endOf('day').toISOString();

            const { data, error } = await supabase
                .from('indent_requests')
                .select(`
          *,
          inventory_items (*)
        `)
                .eq('status', 'Approved')
                .gte('created_at', startOfDay)
                .lte('created_at', endOfDay)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setIndentItems(data || []);
        } catch (error) {
            console.error('Error fetching indent items:', error);
            message.error('Failed to load indent items');
        } finally {
            setLoading(false);
        }
    };

    const groupItemsBySource = () => {
        const grouped = {
            IPD: [],
            OPD: [],
            MFG: [],
        };

        indentItems.forEach(item => {
            const source = item.inventory_items?.indent_source || 'OPD';
            if (!grouped[source]) {
                grouped[source] = [];
            }
            grouped[source].push(item);
        });

        setGroupedItems(grouped);
    };


    const generatePDFDocument = (source, items) => {
        // 1. Initialize Landscape PDF
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
        const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm
        const halfWidth = pageWidth / 2;

        // 2. Draw Dotted Line in the middle for cutting
        doc.setLineWidth(0.2);
        doc.setLineDash([1, 1], 0); // 1mm dash, 1mm space
        doc.setDrawColor(150);
        doc.line(halfWidth, 5, halfWidth, pageHeight - 5); // Coordinate x,y,x,y start to end point
        doc.setLineDash([]); // Reset to solid lines for the rest of the doc
        doc.setDrawColor(0); // Reset to solid black

        // Generate the page content twice on the SAME page (Left side, then Right side)
        const copies = ['SALINAN PEMESAN', 'SALINAN PENGELUAR'];

        copies.forEach((copyLabel, copyIndex) => {
            // 3. Calculate X Offset based on which copy we are drawing
            // Index 0 (Left) = 0 offset
            // Index 1 (Right) = 148.5 offset
            const xOffset = copyIndex * halfWidth;

            // Define local left and right bounds for this specific panel
            const panelLeft = xOffset;
            const panelRight = xOffset + halfWidth;
            const panelCenter = xOffset + (halfWidth / 2);

            let yPosition = 15;

            // Set text color to true black for all text
            doc.setTextColor(0, 0, 0);

            // Copy Label
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            // Position relative to the panel's right edge
            doc.text(copyLabel, panelRight - 7, yPosition, { align: 'right' });
            yPosition += 5;

            // Header - Form Reference
            doc.setFontSize(8);
            doc.setFont(undefined, 'italic');
            doc.text('Pekeliling Perbendaharaan Malaysia', panelLeft + 7, yPosition);
            doc.setFont(undefined, 'normal');
            doc.text('AM 6.5 LAMPIRAN B', panelCenter, yPosition, { align: 'center' });
            doc.text('KEW.PS-8', panelRight - 7, yPosition, { align: 'right' });
            yPosition += 10;

            // Title
            doc.setFontSize(10); // Slightly smaller title to fit
            doc.setFont(undefined, 'bold');
            const title = `BORANG PERMOHONAN STOK UBAT (${source})`;
            doc.text(title, panelCenter, yPosition, { align: 'center' });
            yPosition += 5;

            // Table Data mapping
            const tableData = items.map((item, idx) => [
                (idx + 1).toString(),
                item.inventory_items?.name || '',
                item.requested_qty || 0,
                '',
                '',
                '',
            ]);

            // 4. AutoTable Configuration
            autoTable(doc, {
                startY: yPosition,
                head: [[
                    { content: 'Bil', styles: { halign: 'center' } },
                    { content: 'Perihal stok', styles: { halign: 'center' } },
                    { content: 'Qty', styles: { halign: 'center' } }, // Shortened header
                    { content: 'Catatan', styles: { halign: 'center' } },
                    { content: 'Lulus', styles: { halign: 'center' } }, // Shortened header
                    { content: 'Catatan', styles: { halign: 'center' } },
                ]],
                body: tableData,
                theme: 'grid',
                styles: {
                    fontSize: 8, // Reduced font size for half-page width
                    cellPadding: 2,
                    textColor: [0, 0, 0],
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0],
                },
                bodyStyles: {
                    minCellHeight: 8,
                },
                // 5. Dynamic Margins to constrain table to Left or Right side
                margin: {
                    top: 15,
                    // If Copy 0 (Left): Left Margin 7, Right Margin (HalfWidth + 7)
                    // If Copy 1 (Right): Left Margin (HalfWidth + 7), Right Margin 7
                    left: panelLeft + 5,
                    right: (pageWidth - panelRight) + 5
                },
                // Adjusted columns for narrower width
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },  // Bil
                    1: { cellWidth: 'auto' },               // Perihal (Auto expand)
                    2: { cellWidth: 12, halign: 'center' }, // Kuantiti
                    3: { cellWidth: 15 },                   // Catatan
                    4: { cellWidth: 12, halign: 'center' }, // Lulus
                    5: { cellWidth: 15 },                   // Catatan
                },
                didDrawCell: function (data) {
                    if (data.column.index === 4) {
                        doc.setLineWidth(0.6);
                        doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
                        doc.setLineWidth(0.1);
                    }
                },
            });

            // Signatures
            const finalY = pageHeight - 25; // Moved up slightly
            doc.setFontSize(7); // Smaller font for signature area
            doc.setFont(undefined, 'normal');

            const RedzSign64 = "data:image/png;base64,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";
            const RozzaSign64 = "data:image/png;base64,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";
            // 6. Signature Positioning adjusted for Left/Right panels

            // Left Signature (Pemohon)
            const leftX = panelLeft + 10;
            doc.text('Pemohon', leftX, finalY);
            doc.addImage(RedzSign64, 'PNG', leftX + 10, finalY - 3, 12, 12);
            doc.text('(Tandatangan)', leftX, finalY + 10);
            doc.text('Nama : Muhd Redzuan', leftX, finalY + 13);
            doc.text('Jawatan : PF', leftX, finalY + 16);
            doc.text(`Tarikh : ${new Date().toLocaleDateString('en-GB')}`, leftX, finalY + 19);

            // Middle Signature (Pegawai Pelulus)
            // Positioned roughly in the center of the PANEL
            const middleX = panelCenter - 10;
            doc.text('Pegawai Pelulus', middleX, finalY);
            doc.text('(Tandatangan)', middleX, finalY + 10);
            doc.text('Nama :', middleX, finalY + 13);
            doc.text('Jawatan :', middleX, finalY + 16);
            doc.text(`Tarikh : ${new Date().toLocaleDateString('en-GB')}`, middleX, finalY + 19);

            // Right Signature (Penerima)
            // Positioned near right edge of the PANEL
            const rightX = panelRight - 30;
            doc.text('Penerima', rightX, finalY);
            doc.addImage(RozzaSign64, 'PNG', rightX + 5, finalY + 3, 10, 5);
            doc.text('(Tandatangan)', rightX, finalY + 10);
            doc.text('Nama : Rozzalia', rightX, finalY + 13);
            doc.text('Jawatan : PPF', rightX, finalY + 16);
            doc.text(`Tarikh : ${new Date().toLocaleDateString('en-GB')}`, rightX, finalY + 19);
        });
        return doc;
    };

    // 2. Main handler that decides whether to Download or Preview
    const processPDFExport = (mode) => {
        try {
            let exportCount = 0;

            Object.entries(groupedItems).forEach(([source, items]) => {
                if (items.length === 0 || !selectedSources.includes(source)) return;

                // Generate the doc using our helper
                const doc = generatePDFDocument(source, items);
                const timestamp = new Date().toISOString().split('T')[0];
                const filename = `Indent_ED_${source}_${timestamp}.pdf`;

                if (mode === 'download') {
                    // A. DOWNLOAD MODE
                    doc.save(filename);
                } else {
                    // B. PREVIEW MODE
                    // Try to set title metadata (browsers might use this as tab title)
                    doc.setProperties({ title: filename });

                    const pdfBlob = doc.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl, '_blank');
                }
                exportCount++;
            });

            if (exportCount > 0) {
                message.success(`Successfully processed ${exportCount} PDF file(s)!`);
            } else {
                message.warning('No items to open/download.');
            }
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            message.error('Failed to export to PDF');
        }
    };


    const dateFullCellRender = (value) => {
        const dateStr = value.format('YYYY-MM-DD');
        const hasIndent = datesWithIndents.includes(dateStr);

        if (hasIndent) {
            return (
                <div className="ant-picker-cell-inner">
                    <Badge dot color="#1890ff">
                        {value.date()}
                    </Badge>
                </div>
            );
        }

        return (
            <div className="ant-picker-cell-inner">
                {value.date()}
            </div>
        );
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    const totalItems = indentItems.length;

    return (
        <div className="indent-list-page">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Header */}
                <div>
                    <Title level={3} style={{ margin: 0 }}>Previous Indents</Title>
                    <Text type="secondary">
                        View historical indent records by date
                    </Text>
                </div>

                {/* Date Selector */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: 300, marginBottom: 8, }}>
                        <Text strong>Select Date:</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <Badge dot color="#1890ff" /> Dates with indent records
                        </Text>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <DatePicker
                            value={selectedDate}
                            onChange={(date) => setSelectedDate(date || dayjs())}
                            format="DD/MM/YYYY"
                            size="large"
                            cellRender={dateFullCellRender}
                            inputReadOnly
                            style={{
                                width: '100%', maxWidth: 300, flex: '0 1 auto', cursor: 'pointer'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <Button
                                icon={<EyeOutlined style={{ fontSize: 24 }} />}
                                onClick={() => processPDFExport('preview')}
                                disabled={totalItems === 0}
                                size="large"
                                style={{
                                    backgroundColor: totalItems === 0 ? undefined : '#9c0888ff',
                                    borderColor: totalItems === 0 ? '#d6d6d6' : '#9c0888ff',
                                    color: totalItems === 0 ? undefined : '#fff'
                                }}
                            >
                            </Button>
                            <Button
                                icon={<DownOutlined style={{ fontSize: 19 }} />}
                                onClick={() => processPDFExport('download')}
                                disabled={totalItems === 0}
                                size="large"
                                style={{
                                    backgroundColor: totalItems === 0 ? undefined : '#0050b3',
                                    borderColor: totalItems === 0 ? '#d6d6d6' : '#0050b3',
                                    color: totalItems === 0 ? undefined : '#fff'
                                }}
                            >
                                <span className="button-text">Download</span>
                            </Button>
                        </div>
                    </div>

                </div>



                {/* Results Count */}
                <Text type="secondary">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} on {selectedDate.format('DD/MM/YYYY')}
                </Text>

                {/* Empty State */}
                {totalItems === 0 && (
                    <Empty description="No indent records for this date" />
                )}

                {/* Grouped Items */}
                {totalItems > 0 && (
                    <Collapse>
                        {Object.entries(groupedItems).map(([source, items]) => {
                            if (items.length === 0) return null;

                            return (
                                <Panel
                                    header={
                                        <Space>
                                            <span onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedSources.includes(source)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setSelectedSources(prev => checked
                                                            ? [...prev, source]
                                                            : prev.filter(s => s !== source)
                                                        );
                                                    }}
                                                />
                                            </span>
                                            <Tag color={getSourceColor(source)}>{source}</Tag>
                                            <Text>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                                        </Space>
                                    }
                                    key={source}
                                >
                                    <List
                                        dataSource={items}
                                        renderItem={(item) => (
                                            <List.Item
                                                style={{ flexWrap: 'wrap' }}
                                            >
                                                <List.Item.Meta
                                                    title={
                                                        <Space>
                                                            <Text strong>{item.inventory_items?.name}</Text>
                                                        </Space>
                                                    }
                                                    description={
                                                        <Space direction="vertical" size="small">
                                                            <Space wrap>
                                                                <Tag color={getTypeColor(item.inventory_items?.type)}>
                                                                    {item.inventory_items?.type}
                                                                </Tag>
                                                                <Space size="small">
                                                                    <EnvironmentOutlined style={{ color: '#1890ff' }} />
                                                                    <Text type="secondary">{item.inventory_items?.location_code}</Text>
                                                                </Space>
                                                            </Space>
                                                            <Text>Quantity: <Text strong>{item.requested_qty}</Text></Text>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                Requested: {dayjs(item.created_at).format('DD/MM/YYYY HH:mm')}
                                                            </Text>
                                                        </Space>
                                                    }
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </Panel>
                            );
                        })}
                    </Collapse>
                )
                }
            </Space >

            {/* Responsive Styles */}
            < style > {`
                /* Mobile: responsive adjustments */

                input {
                    cursor: pointer !important;
                    user-select: none;
                }
                
                @media (max-width: 768px) {
                    .ant-collapse-header {
                        padding: 12px !important;
                    }
                    
                    .ant-space-horizontal {
                        gap: 8px !important;
                    }
                    
                    .ant-list-item {
                        padding: 12px !important;
                    }
                    
                    .export-button-container {
                        margin-top: 16px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    .indent-list-page .ant-typography h3 {
                        font-size: 18px !important;
                    }
                    
                    .ant-tag {
                        font-size: 11px !important;
                        padding: 0 4px !important;
                    }
                }

                /* Date picker badge styling */
                .ant-picker-cell-inner .ant-badge {
                    width: 100%;
                }
            `}</style >
        </div >
    );
};

export default IndentListPage;
