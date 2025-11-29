// Compact translations file (English and Portuguese)
export const translations = {
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    close: 'Close',

    // App navigation / common labels
    home: 'Home',
    menu: 'Menu',
    cart: 'Cart',
    addToCart: 'Add to Cart',
    addItem: 'Add',
    viewCart: 'View Cart',
    items: 'items',
    deliveryFee: 'Delivery fee',
    deliveryAddress: 'Delivery Address',

    // Product modal / details
    details: 'Details',
    id: 'ID',
    sku: 'SKU',
    noItemsFound: 'No items found',
    tryAdjustingFilters: 'Try searching with different keywords',

    // Cart / checkout
    subtotal: 'Subtotal',
    total: 'Total',
    proceedToCheckout: 'Proceed to Checkout',

    // Misc
    viewDetails: 'View Details',
  },

  pt: {
    // Common
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Salvar',
    delete: 'Excluir',
    edit: 'Editar',
    search: 'Pesquisar',
    filter: 'Filtrar',
    close: 'Fechar',

    // App navigation / common labels
    home: 'Início',
    menu: 'Menu',
    cart: 'Carrinho',
    addToCart: 'Adicionar ao Carrinho',
    addItem: 'Adicionar',
    viewCart: 'Ver Carrinho',
    items: 'itens',
    deliveryFee: 'Taxa de entrega',
    deliveryAddress: 'Endereço de Entrega',

    // Product modal / details
    details: 'Detalhes',
    id: 'ID',
    sku: 'SKU',
    noItemsFound: 'Nenhum item encontrado',
    tryAdjustingFilters: 'Tente pesquisar com palavras-chave diferentes',

    // Cart / checkout
    subtotal: 'Subtotal',
    total: 'Total',
    proceedToCheckout: 'Finalizar Pedido',

    // Misc
    viewDetails: 'Ver Detalhes',
  },
};

export const getLanguageTranslations = (language = 'en') => {
  return translations[language] || translations['en'];
};
