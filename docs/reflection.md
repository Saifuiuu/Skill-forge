# Reflection Report

# SkillForge - AI Powered Corporate Training and Certification Platform

## Decision 1: Making AI Fallback from the Beginning

### What we decided

We made all four AI features work even if the AI service was not available. These features are:

- Learning Path Recommender
- Quiz Question Generator
- Skill Gap Analyser
- Compliance Risk Alerter

Every API returns a `source` field which tells if the result came from AI or from the fallback. If fallback is used, it also returns a `fallbackReason` so the frontend knows why AI was not used.

### Why we decided it

At the start of the project we did not have a paid AI API key. Because of that, we had to make every feature work without AI.

Later we noticed this also matched the assignment requirement that AI features should continue working even if AI is unavailable.

Instead of adding fallback later, we made it part of the system from the beginning.

### Tradeoffs

The fallback results are much simpler than AI results.

For example, the Learning Path only shows mandatory courses sorted by deadline instead of giving personalised recommendations.

The Skill Gap Analyser only shows completed and missing skills without AI comments or suggestions.

It also meant we had to write and test two paths for every AI feature, which took more time.

### What I would do differently

Next time I would keep more shared logic between the AI and fallback versions.

For example, in the Skill Gap Analyser, the skill calculation is the same in both cases. Only the AI explanation is different.

If I had planned this earlier, the code would have been smaller and easier to maintain.

---

## Decision 2: EventEmitter Problem in NestJS

### What happened

While working on the project, we got an error where `EventEmitter2` could not be injected into some modules.

We already had `EventEmitterModule.forRoot()` inside the main `AppModule`, so we expected it to work everywhere.

The solution that worked was adding `EventEmitterModule.forRoot()` inside every module that needed `EventEmitter2`.

### Why we decided it

We did not fully understand why NestJS behaved like this.

After trying different solutions, this one worked, so we continued with it because we still had a lot of the project left to complete.

This event system is important because certificates are generated when a user passes a quiz. If the event does not work, certificates are never created.

### Tradeoffs

The fix works, but it is not very clean.

Anyone adding a new module later has to remember to add the same configuration again.

If they forget, they may get the same problem.

### What I would do differently

Next time I would spend more time reading the NestJS documentation before using a workaround.

There may have been a better solution, like creating one shared module and importing it where needed.

That would have made the project cleaner.

---

## Decision 3: Using Neon Database with Docker

### What we decided

The assignment required Docker Compose.

Instead of putting PostgreSQL inside Docker, we kept using the Neon cloud database.

Docker Compose only runs the frontend and backend containers, while the backend connects to Neon using the `DATABASE_URL` from the `.env` file.

### Why we decided it

We were already using Neon from the beginning of the project.

By the time we started Docker, all our data and migrations were already there.

Moving everything to a local PostgreSQL container would have taken extra time without giving much benefit for our project.

### Tradeoffs

The biggest problem is that the application always needs internet.

If Neon is unavailable or there is no internet connection, the backend cannot connect to the database.

Even if Docker is running correctly, the application still cannot work without Neon.

### What I would do differently

Next time I would clearly mention this dependency in the documentation.

I would also try to make an optional local PostgreSQL setup for offline development.

That would make the project easier to run in different environments.

---

# Closing Thoughts

Looking back, these decisions were mainly made because of the situation we were in during development.

We did not have an AI budget, we faced a NestJS issue, and we were already using Neon before Docker became part of the project.

The decisions worked and helped us finish the project, but some of them could have been planned better.

The biggest lesson I learned is that quick solutions are useful, but it is also important to understand why they work so the project is easier to maintain later.