// Color mapping functions for drug types and indent sources
// Use these consistently across all components

export const getTypeColor = (type) => {
    const colors = {
        'OPD': 'blue',
        'Eye/Ear/Nose/Inh': 'cyan',
        'DDA': 'red',
        'External': 'green',
        'Injection': 'magenta',
        'Syrup': 'purple',
        'Others': 'default',
        'UOD': 'orange',
        'Non-Drug': 'geekblue',
    };
    return colors[type] || 'default';
};

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
