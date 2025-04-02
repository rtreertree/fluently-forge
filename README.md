# Fluently Forge
This GitHub repository contains the codebase for both the server-side and client-side applications. **Please note that the repository includes an API key, so DO NOT share access with anyone** until the project is complete and the API key has been removed.

---

## Feature list
|   Feature name  |                                                                      description |    status   |
|:---------------:|---------------------------------------------------------------------------------:|:-----------:|
|   welcome page  |                    the root page "/" which show a information about this project | not started |
|  home dashboard |                                           the dashboard which contain everything | not started |
|  login/register | login and register, including account management and integration with a database |     50%     |
| session creator |                                     "/create-session" for create session of user | not started |
| daily streak    |                                                  count and display user activity | working on  |
| account setting |                                       "/setting" make a account and user setting |  working on |

---

## Development Guidelines
### 1. Stay Updated with the Remote Repository
- Always fetch and update your local repository with the latest changes from the remote repository before starting work.  
- Use `git pull origin main` (or the appropriate branch) to ensure your local environment is up to date.  

### 2. Work on a New Feature Branch
- When developing a new feature, always create a new branch based on the latest main branch.  
- Use the naming convention: `feature/<feature-name>` or `fix/<bug-description>`.  
- Example:  
  ``` sh
  git branch feature/user-session    // create
  git checkout feature/user-session  // switch to
  ```
  once you complete your feature, push your changes and create a pull request before merging.
### 3. Follow the `JSDoc` Standard for Code Documentation
- if possible, please use the `JSDoc` for code readability.
- However, simple code commentation is acceptable.
- Example:
    ```ts
    /**
     * Adds two numbers and returns the result.
     * @param {number} a - The first number.
     * @param {number} b - The second number.
     * @returns {number} Sum of a and b.
     */
    function addNumbers(a: number, b: number): number {
        return a + b;
    }
    ```
### 4. Ensure Component Reusability
- Design and develop components to be modular, reusable, and maintainable.
- Follow the DRY (Don't Repeat Yourself) principle.
- Use props, hooks, and context APIs to make components flexible.

---

## Git workflow guide

1. Create new branch from the `main` branch use `git branch <branch-name>` and `git checkout <branch-name>`
2. Make your changes and commit them regularly to keep track of progress.
3. Push the branch to the remote repository.
4. Open the Pull Request(PR) on `Github`
5. Request a code review.
6. Pull the merged changes to your local main branch
7. Repeat

> This guide is based from this [video](https://www.youtube.com/watch?v=S7XpTAnSDL4&t=1168s)

