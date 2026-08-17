import HomePage from '../pages/home/home-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import AddStoryPage from '../pages/add-story/add-story-page';
import SavedStoriesPage from '../pages/saved-stories/saved-stories-page';
import StoryDetailPage from '../pages/story-detail/story-detail-page';

const routes = {
  '/': new HomePage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/add-story': new AddStoryPage(),
  '/saved': new SavedStoriesPage(),
  '/stories/:id': new StoryDetailPage(),
};

export default routes;
