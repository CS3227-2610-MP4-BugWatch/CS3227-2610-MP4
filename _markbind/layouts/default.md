<head-bottom>
  <link rel="stylesheet" href="{{baseUrl}}/stylesheets/main.css">
</head-bottom>

<header sticky>
  <navbar type="dark">
    <a slot="brand" href="{{baseUrl}}/index.html" title="Home" class="navbar-brand">ProjectEx</a>
    <li><a highlight-on="sibling-or-child" href="{{baseUrl}}/userGuide/UserGuide.html" class="nav-link">User Guide</a></li>
    <li><a highlight-on="sibling-or-child" href="{{baseUrl}}/developerGuide/DeveloperGuide.html" class="nav-link">Developer Guide</a></li>
    <li><a href="{{baseUrl}}/docs/developerGuide/AgentWorkflow.html" class="nav-link">Agent Workflow</a></li>
    <li><a highlight-on="sibling-or-child" href="{{baseUrl}}/team/AboutUs.html" class="nav-link">About Us</a></li>
    <li><a href="https://github.com/se-edu" target="_blank" class="nav-link"><md>:fab-github:</md></a>
    </li>
    <li slot="right">
      <form class="navbar-form">
        <searchbar :data="searchData" placeholder="Search" :on-hit="searchCallback" menu-align-right></searchbar>
      </form>
    </li>
  </navbar>
</header>

<div id="flex-body">
  <nav id="site-nav">
    <div class="nav-component slim-scroll">
      <site-nav>
* [Home]({{ baseUrl }}/index.html)
* [User Guide]({{ baseUrl }}/userGuide/UserGuide.html) :expanded:
  * [Authentication]({{ baseUrl }}/docs/userGuide/Authentication.html)
* [Developer Guide]({{ baseUrl }}/developerGuide/DeveloperGuide.html) :expanded:
  * [Authentication and account setup]({{ baseUrl }}/docs/developerGuide/Authentication.html)
  * [Multi-Agent Workflow]({{ baseUrl }}/docs/developerGuide/AgentWorkflow.html)
      </site-nav>
    </div>
  </nav>
  <div id="content-wrapper">
    {{ content }}
  </div>
  <nav id="page-nav">
    <div class="nav-component slim-scroll">
      <page-nav />
    </div>
  </nav>
  <scroll-top-button></scroll-top-button>
</div>

<footer>
  <!-- Support MarkBind by including a link to us on your landing page! -->
  <div class="text-center">
    <small>[<md>**Powered by**</md> <img src="https://markbind.org/favicon.ico" width="30"> {{MarkBind}}]</small>
  </div>
</footer>
