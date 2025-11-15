const routes = {
  '/': () => import('../views/pages/home.js'),
  '/login': () => import('../views/pages/login.js'),
  '/register': () => import('../views/pages/register.js'),
  '/add-story': () => import('../views/pages/add-story.js'),
  '/favorites': () => import('../views/pages/favorites.js'),
  '/settings': () => import('../views/pages/settings.js'),
};

export default routes;