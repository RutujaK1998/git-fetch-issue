import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs/Observable';
import { GithubSearchService } from '../../services/github-search.service';
import { AppError } from '../../common/app-error';
import { NotFoundError } from '../../common/not-found-error';
import { BadRequestError } from '../../common/bad-request-error';
import { UnprocessableEntityError } from '../../common/unprocessable-entity-error';

@Component({
    selector: 'github-api-main',
    templateUrl: './github-api-main.component.html',
    styleUrls: ['./github-api-main.component.styl']
})
export class GithubApiMain implements OnInit {

    repository = new FormControl();
    username = new FormControl();
    pageNumber = new FormControl(1);
    apiForm = new FormGroup({
        repository: this.repository,
        username: this.username,
        pageNumber: this.pageNumber,
    });

    repositories: any[] = [];
    repoTotalCount: number = undefined;
    repoID: string | number = undefined;

    
    waiting:boolean = false;

    dbTime:number = 1300; 
    private error:any;

    constructor(public GHsearch:GithubSearchService) { }

    handleRepos(repositories: any) {
        this.waiting = false; 

        if (repositories instanceof AppError) {
        
            let error = repositories;
            error.message = 'Github said: ' + error.message;
         
            if (!(error instanceof NotFoundError || error instanceof UnprocessableEntityError))
                alert(error.message);
            this.error = error;

        } else {
            
            this.repositories = repositories.items;
            this.repoTotalCount = repositories.total_count;
            this.repoID = undefined;
        }
    }
    sortByList = [{ value: 'login', viewValue: 'Name (Ascending)' },
    { value: '-login', viewValue: 'Name (Descending)' },
    { value: 'score', viewValue: 'Rank (Ascending)' },
    { value: '-score', viewValue: 'Rank (Descending)' }];
    sortBy: FormControl = new FormControl();
    sortElementBy: Array<any>
    SortBy(formValues) {
        this.sortElementBy = [];
        formValues.value ? this.sortElementBy = formValues.value : null;
      }
    

    ngOnInit() {
        /***
        **  Input fields send request through GithubSearchService
        **  and the response goes in repositories array.
        ***/
        this.apiForm.valueChanges
            .debounceTime(this.dbTime)
            .distinctUntilChanged()
            .switchMap(fields => {
                this.waiting = true;
                var searchType: "users" | "repositories" | "issues";

                if (this.repository.value) { searchType = 'repositories'; }
                else if (this.username.value) { searchType = 'users'; }
                else { return Observable.of({}); }

                /*    r:1, u:0/1, p:0/1 // repositories
                **    r:0, u:1,   p:0/1 // users
                **    r:0, u:0,   p:0/1 // return immediately */
                return this.GHsearch.search({
                    searchType:searchType,
                    page: fields.pageNumber,
                    username: fields.username,
                    repository: fields.repository
                })
            })
            .subscribe(this.handleRepos.bind(this));
    }


    searchOpenedIssues(repo) {
        /** Request the repo's issues from github. Fill in the repo.issues list when done.*/
        var
            repoName = repo['name'],
            userName = repo['owner']['login'],
            {id} = repo
        ;
        this.GHsearch.search({
            searchType: 'issues',
            repository: repoName,
            username: userName
        })
        .subscribe(resp=>{
            repo.issues = resp.items; // repo.issues is CREATED here
            repo.open_issues_count = resp.total_count;
            this.repoID = id;
        })
        ;
    }
}
