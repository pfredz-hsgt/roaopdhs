// Color mapping functions for indent sources and new schema fields
// Use these consistently across all components

export const getSourceColor = (source) => {
    const colors = {
        'OPD Counter': 'green',
        'OPD Substore': 'lime',
        'IPD Counter': 'blue',
        'MNF Substor': 'orange',
        'Manufact': 'gold',
        'Prepacking': 'purple',
        'IPD Substore': 'cyan',
    };
    return colors[source] || 'default';
};

export const getPuchaseTypeColor = (type) => {
    const colors = {
        'LP': 'blue',
        'APPL': 'purple',
    };
    return colors[type] || 'default';
};

export const getStdKtColor = (type) => {
    const colors = {
        'STD': 'green',
        'KT': 'orange',
    };
    return colors[type] || 'default';
};
