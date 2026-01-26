import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Row, Col, Typography, Spin, Empty, Button, message } from 'antd';
import { supabase } from '../../lib/supabase';
import DrugCard from '../../components/DrugCard2';
import DrugDetailModal from '../Catalog/DrugDetailModal'; // Reuse existing detail modal if needed
import IndentModal from '../Indent/IndentModal';
import './FloorPlan.css';

const { Title, Text } = Typography;

const FloorPlanApp = () => {
  const [selectedCabinet, setSelectedCabinet] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const cabinets = [
    // --- Kaunter Depan ---
    { id: 'A', top: '24%', left: '54%', width: '25.5%', height: '5.5%' },
    { id: 'B', top: '29.5%', left: '54%', width: '25.5%', height: '5.5%' },
    { id: 'C', top: '42.8%', left: '50.5%', width: '29.3%', height: '8.5%' },

    // --- DDA Cabinet ---
    { id: 'DD', top: '53%', left: '77%', width: '4%', height: '10%' },

    // --- Rak Ubat Injection ---
    { id: 'H', top: '53%', left: '1.5%', width: '13.5%', height: '8.5%' },
    { id: 'I', top: '53%', left: '15%', width: '14%', height: '8.5%' },
    { id: 'J', top: '53%', left: '29%', width: '14%', height: '8.5%' },

    // --- Rak Ubat OPD ---
    { id: 'K', top: '90%', left: '18%', width: '8.5%', height: '8.3%' },
    { id: 'G', top: '90%', left: '30%', width: '14.5%', height: '8.3%' },
    { id: 'F', top: '90%', left: '44.5%', width: '14.5%', height: '8.3%' },
    { id: 'E', top: '90%', left: '59%', width: '14.5%', height: '8.3%' },
    { id: 'D', top: '90%', left: '73.5%', width: '14%', height: '8.3%' },

    // --- Fridge Pharmaceutical ---
    { id: 'Fr', top: '75%', left: '4.5%', width: '7%', height: '9%' },
  ];

  const handleIndentSuccess = useCallback(() => {
    setModalVisible(false);
    message.success('Item added to cart successfully!');
  }, []);

  const handleCabinetClick = (cabId) => {
    setSelectedCabinet(cabId);
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setSelectedCabinet(null);
  };



  return (
    <div className="app-container">
      <h1>Farmasi Kecemasan - Floor Plan</h1>

      {/* THE MAP CONTAINER */}
      <div className="map-wrapper">
        <img src="https://pfredz-hsgt.github.io/imgres/floor/floorplan.png" alt="Pharmacy Floor Plan" className="map-image" />

        {/* Render Clickable Zones */}
        {cabinets.map((cab) => (
          <div
            key={cab.id}
            className="cabinet-zone"
            style={{
              top: cab.top,
              left: cab.left,
              width: cab.width,
              height: cab.height,
            }}
            onClick={() => handleCabinetClick(cab.id)}
            title={`Cabinet ${cab.id}`} // Tooltip on hover
          >
            <span className="zone-label">{cab.id}</span>
          </div>
        ))}
      </div>

      {/* THE MODAL (Shows when a cabinet is selected) */}
      <CabinetModal
        cabinetId={selectedCabinet}
        visible={isModalVisible}
        onClose={handleCloseModal}
      />
    </div>
  );
};

// --- Sub-Component: The Popup Modal ---
const CabinetModal = ({ cabinetId, visible, onClose }) => {
  const [selectedRow, setSelectedRow] = useState(null);
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);

  // Fetch available rows for the cabinet
  const fetchRows = async () => {
    if (!cabinetId) return;
    setRowsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('row')
        .eq('section', cabinetId);

      if (error) throw error;

      // Extract unique row numbers and sort them (Descending: Highest on top)
      const uniqueRows = [...new Set(data.map(item => item.row).filter(r => r !== null))].sort((a, b) => b - a);
      setRows(uniqueRows);

      // Select first row by default if available
      if (uniqueRows.length > 0) {
        setSelectedRow(uniqueRows[0]);
      } else {
        setSelectedRow(null);
      }
    } catch (error) {
      console.error('Error fetching rows:', error);
      message.error('Failed to load cabinet rows');
    } finally {
      setRowsLoading(false);
    }
  };

  useEffect(() => {
    if (visible && cabinetId) {
      fetchRows();
    } else {
      // Reset state when closed
      setItems([]);
      setRows([]);
      setSelectedRow(null);
    }
  }, [visible, cabinetId]);

  // Fetch items when row changes
  useEffect(() => {
    if (visible && cabinetId && selectedRow !== null) {
      fetchItems(selectedRow);
    }
  }, [selectedRow, visible, cabinetId]);

  const fetchItems = async (rowNum) => {
    if (!cabinetId || rowNum === null) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('section', cabinetId)
        .eq('row', rowNum);

      if (data) {
        data.sort((a, b) => {
          const prefixA = a.bin.replace(/[0-9]/g, '');
          const prefixB = b.bin.replace(/[0-9]/g, '');
          if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);

          const numA = parseInt(a.bin.replace(/[^0-9]/g, ''));
          const numB = parseInt(b.bin.replace(/[^0-9]/g, ''));
          return numA - numB;
        });
      }


      if (error) {
        console.error('Error fetching:', error);
        message.error('Failed to load items');
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrugClick = (drug) => {
    setSelectedDrug(drug);
    setModalVisible(true);
  };

  const handleIndentSuccess = () => {
    setModalVisible(false);
    message.success('Item added to cart successfully!');
  };

  return (
    <>
      <Modal
        title={<Title level={3}>Rak {cabinetId}</Title>}
        open={visible}
        onCancel={onClose}
        footer={[
          <Button key="close" onClick={onClose}>
            Close
          </Button>
        ]}
        width={1000}
        centered
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', minHeight: '400px' }}>

          {/* Vertical Row Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '60px', borderRight: '1px solid #f0f0f0', paddingRight: '16px' }}>
            <Title level={5} style={{ marginBottom: '12px', marginTop: 0 }}>Tingkat</Title>
            {rowsLoading ? (
              <Spin size="small" />
            ) : rows.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                {rows.map(r => (
                  <Button
                    key={r}
                    type={selectedRow === r ? 'primary' : 'default'}
                    shape="round"
                    onClick={() => setSelectedRow(r)}
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '16px',
                      fontWeight: selectedRow === r ? 'bold' : 'normal'
                    }}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            ) : (
              <Text type="secondary" italic>N/A</Text>
            )}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '600px', paddingRight: '8px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Spin size="large" />
              </div>
            ) : items.length > 0 ? (
              <Row gutter={[16, 16]}>
                {items.map((item) => (
                  <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                    <DrugCard
                      drug={item}
                      onClick={() => handleDrugClick(item)}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty description={`No items found in Row ${selectedRow}`} />
            )}
          </div>
        </div>
      </Modal>

      <IndentModal
        drug={selectedDrug}
        visible={modalVisible}
        onClose={(shouldRefresh) => {
          setModalVisible(false);
          if (shouldRefresh && selectedRow) {
            fetchItems(selectedRow);
          }
        }}
        onSuccess={handleIndentSuccess}
        onDrugUpdate={() => {
          if (selectedRow) fetchItems(selectedRow);
        }}
      />
    </>
  );
};

export default FloorPlanApp;