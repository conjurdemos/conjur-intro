class IssueSyncer

  def sync(since)
    client = Octokit::Client.new(access_token: ENV['GITHUB_TOKEN'])
    client.auto_paginate = true

    ['cyberark', 'conjurinc'].each do |org|
      client.org_issues(org, filter: 'all', state: 'closed', since: since.strftime('%Y-%m-%d')).each do |issue|
        next if issue.pull_request
        next if issue.repository.full_name == 'conjurinc/playroom'
        next if issue.labels.any?{|l| l.name.match?('epic') }
        next if client.issue_comments(issue.repository.full_name, issue.number).any?{|c| c.body.match?('This issue was moved') }

        ar_issue = Issue.find_or_create_by(repository: issue.repository.full_name, number: issue.number)
        ar_issue.title = issue.title
        ar_issue.assignees = issue.assignees.map {|a| a.login}.join(', ')
        ar_issue.bug = issue.labels.any? {|l| l.name.match?('bug') }
        ar_issue.critical_bug = issue.labels.any? {|l| l.name.match?('critical') }
        ar_issue.opened_at = issue.created_at

        events = client.issue_events(issue.repository.full_name, issue.number)

        start_event = events.find {|e| e.event == 'labeled' && e.label.name == 'in progress' }
        finish_event = events.find_all {|e| e.event == 'closed'}.last
        pr_event = events.find {|e| e.event == 'labeled' && e.label.name == 'review' }

        if finish_event
          ar_issue.completed = finish_event.created_at
        end
        if pr_event
          ar_issue.pr_opened_at = pr_event.created_at
        end
        if start_event
          puts "#{issue.title} - #{issue.repository.full_name}##{issue.number}"
          puts "  assignees: #{issue.assignees.map {|a| a.login}.join(', ')}"
          started = start_event.created_at
          finished = finish_event.created_at

          ar_issue.started = started
          ar_issue.completed = finished
          if !started.nil? && !finished.nil?
            elapsed = (finished - started)
            ar_issue.elapsed_time = elapsed
            puts "  Time to complete: #{elapsed.round(2)} seconds (#{started} - #{finished})"
          end

        else
          # skip issues that have been moved to a different repository
          unless client.issue_comments(issue.repository.full_name, issue.number).any?{|c| c.body.match?('This issue was moved') }
            puts "#{issue.title} - #{issue.repository.full_name}##{issue.number}"
            puts "  assignees: #{issue.assignees.map {|a| a.login}.join(', ')}"
            puts "  issue was not part of Waffle :("
          end
        end
        ar_issue.save
        puts '-------------'
        puts ''
      end
    end
  end
end
