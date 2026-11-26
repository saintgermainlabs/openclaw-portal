import { createBrowserRouter } from 'react-router'
import PortalShell from './portal/PortalShell'
import Root from './layouts/Root'
import Home from './pages/Home'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import Tools from './pages/Tools'
import SacredGeometryBuilder from './tools/SacredGeometryBuilder'
import HexLatticeExplorer from './tools/HexLatticeExplorer'
import FibonacciSpiralGenerator from './tools/FibonacciSpiralGenerator'
import DagPlanner from './tools/DagPlanner'
import KnowledgeBase from './pages/KnowledgeBase'
import Inventory from './pages/Inventory'
import NotFound from './pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: PortalShell,
  },
  {
    path: '/inventory',
    Component: Inventory,
  },
  {
    path: '/site',
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: 'blog', Component: Blog },
      { path: 'blog/:slug', Component: BlogPost },
      { path: 'tools', Component: Tools },
      { path: 'tools/sacred-geometry', Component: SacredGeometryBuilder },
      { path: 'tools/hex-lattice', Component: HexLatticeExplorer },
      { path: 'tools/fibonacci-spiral', Component: FibonacciSpiralGenerator },
      { path: 'tools/dag-planner', Component: DagPlanner },
      { path: 'knowledge', Component: KnowledgeBase },
      { path: '*', Component: NotFound },
    ],
  },
  { path: '*', Component: NotFound },
])
